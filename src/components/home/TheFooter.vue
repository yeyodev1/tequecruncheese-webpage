<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="footer bg-accent text-white">
    <div class="footer__container">
      <div class="footer__top">
        <div class="footer__brand">
          <img src="@/assets/logos/logo-small.png" alt="TequeCruncheese" class="footer__logo" />
          <p class="footer__tagline">Tequeños artesanales hechos a mano. Perfectamente dorados, increíblemente quesudos.</p>
        </div>
        
        <div class="footer__links">
          <div class="footer__col">
            <h4 class="footer__heading">Explora</h4>
            <a href="#about" class="footer__link">Nuestra Historia</a>
            <a href="#menu" class="footer__link">Menú</a>
            <a href="#locations" class="footer__link">Kioskos</a>
          </div>
          <div class="footer__col">
            <h4 class="footer__heading">Contacto</h4>
            <a href="mailto:hello@tequecruncheese.com" class="footer__link">hello@tequecruncheese.com</a>
            <a href="tel:+1234567890" class="footer__link">+1 (234) 567-890</a>
          </div>
          <div class="footer__col">
            <h4 class="footer__heading">Social</h4>
            <a href="#" class="footer__link">Instagram</a>
            <a href="#" class="footer__link">Facebook</a>
            <a href="#" class="footer__link">TikTok</a>
          </div>
        </div>
      </div>

      <div class="footer__bottom">
        <p class="footer__copy">&copy; {{ currentYear }} TequeCruncheese. Todos los derechos reservados.</p>
        <div class="footer__legal">
          <a href="#" class="footer__link">Política de Privacidad</a>
          <a href="#" class="footer__link">Términos de Servicio</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  padding: $spacing-xxl $spacing-md $spacing-lg;
  
  &__container {
    max-width: 1200px;
    margin: 0 auto;
  }

  &__top {
    display: flex;
    flex-direction: column;
    gap: $spacing-xxl;
    margin-bottom: $spacing-xxl;

    @include respond-to('lg') {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  &__brand {
    max-width: 320px;
  }

  &__logo {
    height: 60px;
    width: auto;
    margin-bottom: $spacing-lg;
    filter: brightness(0) invert(1); // Make logo white for dark background if it's not already
  }

  &__tagline {
    font-size: 1.125rem;
    color: rgba($white, 0.8);
    line-height: 1.6;
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-xl;

    @include respond-to('md') {
      grid-template-columns: repeat(3, 1fr);
      gap: $spacing-xxl;
    }
  }

  &__heading {
    font-family: $font-secondary;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: $spacing-md;
    color: $color-primary;
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__link {
    color: rgba($white, 0.7);
    font-size: 0.95rem;
    transition: color 0.2s ease;

    &:hover {
      color: $white;
    }
  }

  &__bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-md;
    padding-top: $spacing-lg;
    border-top: 1px solid rgba($white, 0.1);
    text-align: center;

    @include respond-to('md') {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
  }

  &__copy {
    color: rgba($white, 0.5);
    font-size: 0.875rem;
  }

  &__legal {
    display: flex;
    gap: $spacing-md;
    
    .footer__link {
      font-size: 0.875rem;
      color: rgba($white, 0.5);

      &:hover {
        color: $white;
      }
    }
  }
}
</style>
