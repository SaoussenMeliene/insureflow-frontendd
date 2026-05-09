import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const firebaseConfig = {
  apiKey: "AIzaSyDF6OPbo5xr_iaYNOqDykNT1O35bCVVX1g",
  authDomain: "insureflow-b2aff.firebaseapp.com",
  projectId: "insureflow-b2aff",
  storageBucket: "insureflow-b2aff.firebasestorage.app",
  messagingSenderId: "755938427431",
  appId: "1:755938427431:web:1a7bb21dd1980388fa0402"
};

@Injectable({ providedIn: 'root' })
export class FirebaseNotificationService {

  // ✅ Charge depuis localStorage au démarrage
  private notificationsSubject = new BehaviorSubject<any[]>(
    JSON.parse(localStorage.getItem('insureflow_notifications') || '[]')
  );
  notifications$ = this.notificationsSubject.asObservable();

  // ✅ Compteur de notifications vues
  private seenCount = parseInt(localStorage.getItem('insureflow_seen') || '0');

  private apiUrl    = 'http://localhost:8080';
  private app       = initializeApp(firebaseConfig);
  private messaging = getMessaging(this.app);

  constructor(
    private http:        HttpClient,
    private authService: AuthService
  ) {
    // ✅ Écoute les messages du service worker (background)
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

      // ✅ Écoute foreground
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

  // ✅ Méthode centrale pour ajouter + persister
  private addNotif(title: string, body: string) {
    const current = this.notificationsSubject.getValue();
    const newNotifs = [
      { title, body, time: new Date() },
      ...current
    ];
    this.notificationsSubject.next(newNotifs);
    localStorage.setItem('insureflow_notifications', JSON.stringify(newNotifs));
  }

  // ✅ Nombre de notifications non lues
  getUnreadCount(): number {
    const total = this.notificationsSubject.getValue().length;
    return Math.max(0, total - this.seenCount);
  }

  // ✅ Marquer toutes comme vues
  markAsSeen() {
    this.seenCount = this.notificationsSubject.getValue().length;
    localStorage.setItem('insureflow_seen', String(this.seenCount));
  }

  // ✅ Ajouter une notification manuellement
  addNotification(title: string, body: string) {
    this.addNotif(title, body);
  }

  // ✅ Effacer toutes les notifications
  clearNotifications() {
    this.notificationsSubject.next([]);
    this.seenCount = 0;
    localStorage.removeItem('insureflow_notifications');
    localStorage.removeItem('insureflow_seen');
  }

  // ✅ Callback pour écouter dans les composants
  onMessage(callback: (payload: any) => void) {
    onMessage(this.messaging, callback);
  }

  private saveFcmToken(fcmToken: string) {
    const user = this.authService.getUser();
    if (!user) return;

    const email = user.email;
    if (!email) return;

    this.http.patch(
      `${this.apiUrl}/api/auth/users/email/${email}/fcm-token`,
      { fcmToken }
    ).subscribe({
      next: () => console.log('✅ FCM token sauvegardé'),
      error: (err) => console.error('❌ Erreur:', err)
    });
  }
}