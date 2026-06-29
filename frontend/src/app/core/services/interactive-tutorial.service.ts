import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { driver, DriveStep } from 'driver.js';

@Injectable({ providedIn: 'root' })
export class InteractiveTutorialService {
  private i18n = inject(I18nService);
  private driverObj: any = null;

  start(steps: DriveStep[], onComplete?: () => void, onDestroy?: () => void) {
    if (this.driverObj) {
      this.driverObj.destroy();
    }

    const localizedSteps = steps.map(step => {
      const p = step.popover;
      if (p) {
        return {
          ...step,
          popover: {
            ...p,
            title: p.title ? (this.i18n.t(p.title)() || p.title) : undefined,
            description: p.description ? (this.i18n.t(p.description)() || p.description) : undefined,
            doneBtnText: this.i18n.t('tutorial.finish')() || 'Done',
            closeBtnText: this.i18n.t('tutorial.skip')() || 'Skip',
            nextBtnText: this.i18n.t('tutorial.next')() || 'Next',
            prevBtnText: this.i18n.t('tutorial.prev')() || 'Prev',
          }
        };
      }
      return step;
    });

    this.driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: false, // Force them to use the buttons
      steps: localizedSteps,
      onDestroyStarted: () => {
        if (!this.driverObj.hasNextStep() || confirm('Are you sure you want to exit the tutorial?')) {
          this.driverObj.destroy();
          if (onDestroy) onDestroy();
          if (onComplete && !this.driverObj.hasNextStep()) {
            onComplete();
          }
        }
      },
    });

    this.driverObj.drive();
  }

  destroy() {
    if (this.driverObj) {
      this.driverObj.destroy();
      this.driverObj = null;
    }
  }
}
