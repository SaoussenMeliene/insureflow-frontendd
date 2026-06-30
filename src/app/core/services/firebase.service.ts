import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment'; // ← AJOUTÉ

const firebaseConfig = {
  apiKey:            "AIzaSyDF6OPbo5xr_iaYNOqDykNT1O35bCVVX1g",
  authDomain:        "insureflow-b2aff.firebaseapp.com",
  projectId:         "insureflow-b2aff",
  storageBucket:     "insureflow-b2aff.firebasestorage.app",
  messagingSenderId: "755938427431",
  appId:             "1:755938427431:web:1a7bb21dd1980388fa0402"
};

@Injectable({ providedIn: 'root' })
export class FirebaseNotificationService {

  private notificationsSubject = new BehaviorSubject<any[]>(
    JSON.parse(localStorage.getItem('insureflow_notifications') || '[]')
  );
  notifications$ = this.notificationsSubject.asObservable();

  private seenCount = parseInt(localStorage.getItem('insureflow_seen') || '0');

  private apiUrl    = environment.apiUrl; // ← CORRIGÉ
  private app       = initializeApp(firebaseConfig);
  private messaging = getMessaging(this.app);

  constructor(
    private http:        HttpClient,
    private authService: AuthService
  ) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          console.log('🔔 Notification SW reçue:', event.data);
          this.addNotif(
            event.data.title || '',
            event.data.body  || ''
          );
        }
      });
    }
  }

  async initNotifications() {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'denied') return;

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }

      const token = await getToken(this.messaging, {
        vapidKey: 'BKObWyuSPNRO3kYO-srRh41gadg1P1aXpS1qGEphm8ZcMndp6qV0BFFXnf03ap7OTdYfh6AWcXVjs8GEjxJY_t4'
      });

      if (token) {
        console.log('✅ FCM Token web:', token);
        this.saveFcmToken(token);
      }

      onMessage(this.messaging, (payload) => {
        console.log('📩 Notification foreground:', payload);
        this.addNotif(
          payload.notification?.title || '',
          payload.notification?.body  || ''
        );
      });

    } catch (err) {
      console.error('Erreur FCM:', err);
    }
  }

  private addNotif(title: string, body: string) {
    const current = this.notificationsSubject.getValue();
    const newNotifs = [
      { title, body, time: new Date() },
      ...current
    ];
    this.notificationsSubject.next(newNotifs);
    localStorage.setItem('insureflow_notifications', JSON.stringify(newNotifs));
  }

  getUnreadCount(): number {
    const total = this.notificationsSubject.getValue().length;
    return Math.max(0, total - this.seenCount);
  }

  markAsSeen() {
    this.seenCount = this.notificationsSubject.getValue().length;
    localStorage.setItem('insureflow_seen', String(this.seenCount));
  }

  addNotification(title: string, body: string) {
    this.addNotif(title, body);
  }

  clearNotifications() {
    this.notificationsSubject.next([]);
    this.seenCount = 0;
    localStorage.removeItem('insureflow_notifications');
    localStorage.removeItem('insureflow_seen');
  }

  onMessage(callback: (payload: any) => void) {
    onMessage(this.messaging, callback);
  }

  private saveFcmToken(fcmToken: string) {
    const user = this.authService.getUser();
    if (!user) return;

    const email = user.email;
    if (!email) return;

    this.http.patch(
      `${this.apiUrl}/api/auth/users/email/${email}/fcm-token`, // ← CORRIGÉ
      { fcmToken }
    ).subscribe({
      next: () => console.log('✅ FCM token sauvegardé'),
      error: (err) => console.error('❌ Erreur:', err)
    });
  }
}