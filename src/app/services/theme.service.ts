import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

const THEME_KEY = 'theme-preference';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  isDarkMode = false;

  constructor(
    private storage: Storage,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  async init() {
    await this.storage.create();
    const storedTheme = await this.storage.get(THEME_KEY);
    
    if (storedTheme !== null) {
      this.isDarkMode = storedTheme;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode = prefersDark.matches;
    }
    this.updateBodyClass();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.updateBodyClass();
    this.storage.set(THEME_KEY, this.isDarkMode);
  }

  private updateBodyClass() {
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark');
    } else {
      this.renderer.removeClass(document.body, 'dark');
    }
  }
}
