<script setup lang="ts">
const currentYear = new Date().getFullYear()
const waLink = 'https://wa.me/593963237880'
</script>

<template>
  <footer id="contact" class="footer">
    <div class="footer__accent-bar"></div>

    <div class="footer__container">
      <!-- Brand block -->
      <div class="footer__brand">
        <img src="@/assets/logos/logo-small.png" alt="TequeCruncheese" class="footer__logo" />
        <p class="footer__tagline">Tequeños artesanales hechos a mano.<br />Perfectamente dorados, increíblemente quesudos.</p>

        <!-- Social pills -->
        <div class="footer__social">
          <a :href="waLink" target="_blank" rel="noopener" class="footer__social-pill" aria-label="WhatsApp">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
          <a href="https://www.instagram.com/tequecruncheese_gye/" target="_blank" rel="noopener" class="footer__social-pill" aria-label="Instagram">
            <i class="fa-brands fa-instagram"></i> Instagram
          </a>
          <a href="https://www.facebook.com/Tequecruncheese" target="_blank" rel="noopener" class="footer__social-pill" aria-label="Facebook">
            <i class="fa-brands fa-facebook-f"></i> Facebook
          </a>
        </div>
      </div>

      <!-- Nav links -->
      <div class="footer__links">
        <div class="footer__col">
          <h4 class="footer__heading">Explora</h4>
          <a href="#about" class="footer__link"><i class="fa-solid fa-chevron-right"></i> Nuestra Historia</a>
          <a href="#menu" class="footer__link"><i class="fa-solid fa-chevron-right"></i> Menú</a>
          <a href="#locations" class="footer__link"><i class="fa-solid fa-chevron-right"></i> Kioskos</a>
        </div>
        <div class="footer__col">
          <h4 class="footer__heading">Contacto</h4>
          <a href="mailto:Tequecruncheese.ec@gmail.com" class="footer__link footer__link--break">
            <i class="fa-solid fa-envelope"></i> Tequecruncheese.ec@gmail.com
          </a>
          <a :href="waLink" target="_blank" rel="noopener" class="footer__link">
            <i class="fa-brands fa-whatsapp"></i> +593 96 323 7880
          </a>
          <a href="https://www.instagram.com/tequecruncheese_gye/" target="_blank" rel="noopener" class="footer__link">
            <i class="fa-brands fa-instagram"></i> @tequecruncheese_gye
          </a>
          <a href="https://www.facebook.com/Tequecruncheese" target="_blank" rel="noopener" class="footer__link">
            <i class="fa-brands fa-facebook-f"></i> Tequecruncheese
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="footer__bottom">
      <p class="footer__copy">&copy; {{ currentYear }} TequeCruncheese. Todos los derechos reservados.</p>
      <div class="footer__legal">
        <a href="#" class="footer__legal-link">Privacidad</a>
        <span class="footer__legal-sep">·</span>
        <a href="#" class="footer__legal-link">Términos</a>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  background-color: $color-accent;
  color: $white;

  &__accent-bar {
    height: 5px;
    background: linear-gradient(90deg, $color-primary 0%, lighten($color-primary, 10%) 50%, $color-primary 100%);
  }

  &__container {
    max-width: 1200px;
    margin: 0 auto;
    padding: $spacing-xxl $spacing-md;
    display: flex;
    flex-direction: column;
    gap: $spacing-xxl;

    @include respond-to('lg') {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    @include respond-to('lg') {
      align-items: flex-start;
      text-align: left;
      max-width: 340px;
    }
  }

  &__logo {
    height: 64px;
    width: auto;
    margin-bottom: $spacing-lg;
    filter: brightness(0) invert(1);
  }

  &__tagline {
    font-size: 1rem;
    color: rgba($white, 0.75);
    line-height: 1.7;
    margin-bottom: $spacing-lg;
  }

  &__social {
    display: flex;
    gap: $spacing-sm;
    flex-wrap: wrap;
    justify-content: center;

    @include respond-to('lg') {
      justify-content: flex-start;
    }
  }

  &__social-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 9999px;
    border: 1px solid rgba($color-primary, 0.5);
    color: $color-primary;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: all 0.2s ease;

    &:hover {
      background-color: $color-primary;
      color: $color-accent;
      border-color: $color-primary;
    }
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-xl;

    @include respond-to('lg') {
      gap: $spacing-xxl;
    }
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__heading {
    font-family: $font-secondary;
    font-size: 1.1rem;
    font-weight: 700;
    color: $color-primary;
    margin-bottom: $spacing-sm;
    letter-spacing: 0.03em;
  }

  &__link {
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    color: rgba($white, 0.7);
    font-size: 0.9rem;
    line-height: 1.5;
    padding: 3px 0;
    transition: color 0.2s ease, gap 0.2s ease;

    i {
      margin-top: 3px;
      flex-shrink: 0;
      color: rgba($color-primary, 0.7);
      transition: color 0.2s ease;
    }

    &:hover {
      color: $white;
      gap: 10px;

      i { color: $color-primary; }
    }

    &--break {
      word-break: break-all;
    }
  }

  &__bottom {
    border-top: 1px solid rgba($white, 0.08);
    padding: $spacing-md $spacing-md;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    text-align: center;
    box-sizing: border-box;

    @include respond-to('md') {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
  }

  &__copy {
    color: rgba($white, 0.4);
    font-size: 0.8rem;
  }

  &__legal {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__legal-link {
    color: rgba($white, 0.4);
    font-size: 0.8rem;
    transition: color 0.2s ease;

    &:hover { color: $white; }
  }

  &__legal-sep {
    color: rgba($white, 0.2);
    font-size: 0.8rem;
  }
}
</style>
