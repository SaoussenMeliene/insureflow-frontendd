import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent implements OnInit, OnDestroy {

  openFaq: number | null = null;
  navbarScrolled = false;

  private scrollObserver?: IntersectionObserver;

  faqItems = [
    {
      question: 'Comment déclarer un sinistre ?',
      answer: 'Connectez-vous à votre espace client, cliquez sur « Déclarer un sinistre » et suivez les étapes guidées. Vous pourrez joindre des photos et documents en quelques clics.'
    },
    {
      question: 'Combien de temps prend le traitement ?',
      answer: 'Grâce à notre pipeline IA multi-agents, la majorité des dossiers sont traités en moins de 24h. Les cas complexes nécessitant une révision humaine peuvent prendre 2 à 3 jours ouvrés.'
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Oui. Toutes vos données sont chiffrées (TLS + AES-256) et hébergées sur des serveurs conformes aux normes RGPD. Nous ne partageons jamais vos informations avec des tiers sans votre consentement.'
    },
    {
      question: 'Puis-je suivre l\'état de mon dossier en temps réel ?',
      answer: 'Absolument. Depuis votre espace client, vous avez accès au suivi en temps réel de chaque étape du pipeline de traitement de votre sinistre.'
    },
    {
      question: 'L\'IA remplace-t-elle les experts humains ?',
      answer: 'Non. L\'IA analyse et pré-traite les dossiers pour gagner en rapidité, mais chaque cas signalé ou ambigu est soumis à la révision d\'un expert humain avant toute décision finale.'
    },
    {
      question: 'Quels types de sinistres sont pris en charge ?',
      answer: 'InsureFlow prend en charge les sinistres automobile (AUTO), habitation (HOME), santé (HEALTH), scolaire (SCOLAIRE) et divers (OTHER).'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // ── Scroll reveal pour toutes les sections ──
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    setTimeout(() => {
      document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right')
        .forEach(el => this.scrollObserver?.observe(el));
    }, 100);
  }

  ngOnDestroy() {
    this.scrollObserver?.disconnect();
  }

  // ── Navbar shadow au scroll ──
  @HostListener('window:scroll')
  onScroll() {
    this.navbarScrolled = window.scrollY > 20;
  }

  toggleFaq(index: number) {
    this.openFaq = this.openFaq === index ? null : index;
  }

  goToLogin()    { this.router.navigate(['/login']); }
  goToRegister() { this.router.navigate(['/register']); }
}