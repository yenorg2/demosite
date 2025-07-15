// Dropin Components
import {
  Button,
  provider as UI,
} from '@dropins/tools/components.js';

// Block-level
import createModal from '../modal/modal.js';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getRootPath, isMultistore } from '../../scripts/configs.js';

/**
 * Toggles all storeSelector sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleStoreDropdown(sections, expanded = false) {
  sections
    .querySelectorAll('.storeview-modal .default-content-wrapper > ul > li')
    .forEach((section) => {
      section.setAttribute('aria-expanded', expanded);
    });
}

/**
 * Initialize footer accordion functionality
 * @param {Element} block The footer block element
 */
function initializeFooterAccordion(block) {
  // Store event listeners for cleanup
  let clickListeners = [];
  let keydownListeners = [];
  let currentMode = window.innerWidth < 600 ? 'mobile' : 'desktop';

  function setupMobileMode() {
    // Hide all ul elements initially
    const allUlElements = block.querySelectorAll('.block-footer-links ul');
    allUlElements.forEach(ul => {
      ul.style.display = 'none';
    });

    // Add click event listeners to all h3 elements
    const allH3Elements = block.querySelectorAll('.block-footer-links h3');
    allH3Elements.forEach(h3 => {
      // Add cursor pointer to indicate clickable
      h3.style.cursor = 'pointer';

      // Create click event listener
      const clickListener = function () {
        const ul = this.nextElementSibling;
        if (ul && ul.tagName === 'UL') {
          // Toggle visibility
          if (ul.style.display === 'none' || ul.style.display === '') {
            ul.style.display = 'block';
            this.setAttribute('aria-expanded', 'true');
          } else {
            ul.style.display = 'none';
            this.setAttribute('aria-expanded', 'false');
          }
        }
      };

      // Create keydown event listener
      const keydownListener = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      };

      // Add event listeners
      h3.addEventListener('click', clickListener);
      h3.addEventListener('keydown', keydownListener);

      // Store listeners for cleanup
      clickListeners.push({ element: h3, listener: clickListener });
      keydownListeners.push({ element: h3, listener: keydownListener });

      // Set initial aria-expanded state
      h3.setAttribute('aria-expanded', 'false');
      h3.setAttribute('tabindex', '0');
      h3.setAttribute('role', 'button');
    });
  }

  function setupDesktopMode() {
    // Show all ul elements
    const allUlElements = block.querySelectorAll('.block-footer-links ul');
    allUlElements.forEach(ul => {
      ul.style.display = 'block';
    });

    // Remove mobile-specific attributes and event listeners
    const allH3Elements = block.querySelectorAll('.block-footer-links h3');
    allH3Elements.forEach(h3 => {
      h3.style.cursor = 'default';
      h3.removeAttribute('aria-expanded');
      h3.removeAttribute('tabindex');
      h3.removeAttribute('role');
    });

    // Clean up event listeners
    clickListeners.forEach(({ element, listener }) => {
      element.removeEventListener('click', listener);
    });
    keydownListeners.forEach(({ element, listener }) => {
      element.removeEventListener('keydown', listener);
    });

    // Clear arrays
    clickListeners = [];
    keydownListeners = [];
  }

  // Initialize based on current screen size
  if (currentMode === 'mobile') {
    setupMobileMode();
  } else {
    setupDesktopMode();
  }

  // Handle window resize with debouncing
  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      const newMode = window.innerWidth < 600 ? 'mobile' : 'desktop';

      if (newMode !== currentMode) {
        currentMode = newMode;
        if (newMode === 'mobile') {
          // Switch to mobile mode
          setupMobileMode();
        } else {
          // Switch to desktop mode
          setupDesktopMode();
        }
      }
    }, 250); // Debounce resize events
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const root = getRootPath();
  // Load Footer as Fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');

  // Footer content - Store Switcher
  if (isMultistore()) {
    footer.innerHTML = `
      <div class="storeview-switcher-button"></div>
    `;

    // Container and component refs
    let modal;

    // Modal Actions
    const showModal = async (content) => {
      modal = await createModal([content]);
      modal.showModal();
    };

    // Rendering the Store Switcher Modal Content
    const $storeSwitcherBtn = footer.querySelector(
      '.storeview-switcher-button',
    );

    // Store Switcher Modal Content
    const storeSwitcherPath = '/store-switcher';
    let fragmentStoreView;

    try {
      fragmentStoreView = await loadFragment(storeSwitcherPath);
      if (!fragmentStoreView) throw new Error(`Footer does not render due to Store Switcher fragment (${storeSwitcherPath}) not found`);
    } catch (error) {
      console.error('Error loading store switcher fragment:', error);
      return;
    }

    // Store Switcher Modal Content
    const storeSwitcher = document.createElement('div');

    // Return Storename from stores-switcher
    const selected = [...fragmentStoreView.querySelectorAll('a')].find((a) => {
      const url = new URL(a.href);
      return url.pathname.startsWith(root);
    });

    storeSwitcher.id = 'storeview-modal';
    while (fragmentStoreView.firstElementChild) {
      storeSwitcher.append(fragmentStoreView.firstElementChild);
    }

    // create classes for storeview modal sections
    const classes = ['storeview-title', 'storeview-list'];
    classes.forEach((c, i) => {
      const section = storeSwitcher.children[i];
      if (section) section.classList.add(`storeview-modal-${c}`);
    });

    // Store Switcher Modal Content - Store View Title
    const storeViewTitle = storeSwitcher.querySelector('.storeview-modal-storeview-title');
    const title = storeViewTitle.querySelector('h3');
    if (title) {
      title.className = '';
      title.closest('h3').classList.add('storeview-modal-storeview-title');
      title.setAttribute('tabindex', '0');
    }

    // Storeview List
    const storeViewList = storeSwitcher.querySelector('.storeview-modal-storeview-list');

    if (storeViewList && storeViewList.children.length) {
      // Add storeview-selection class to parent UL
      storeViewList
        .querySelectorAll(':scope .default-content-wrapper > ul')
        .forEach((storeView) => {
          if (storeView.querySelector('ul')) storeView.classList.add('storeview-selection');
        });

      // if multiple stores exist per region, add class storeviews and click events for accordion
      storeViewList.querySelectorAll('.default-content-wrapper > ul > li > ul').forEach((storeRegion) => {
        if (storeRegion.children.length > 1) {
          if (storeRegion.querySelector('ul')) storeRegion.classList.add('storeviews');

          // Accessiblity: addeventlistener for 'click' and keyboard event and tab indexes
          storeViewList.querySelectorAll(':scope li').forEach((storeView) => {
            const link = storeView.closest('a');
            if (link) link.setAttribute('tabindex', '0');
            storeView.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const expanded = storeView.getAttribute('aria-expanded') === 'true';
                toggleStoreDropdown(storeViewList);
                storeView.setAttribute('aria-expanded', expanded ? 'false' : 'true');
              }
            });
            storeView.addEventListener('click', () => {
              const expanded = storeView.getAttribute('aria-expanded') === 'true';
              toggleStoreDropdown(storeViewList);
              storeView.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            });
          });
        }
      });

      // If only one storeview link in region, convert parent UL into the li and remove the child UL
      storeViewList.querySelectorAll('.default-content-wrapper > ul > li > ul').forEach((storeRegion) => {
        const li = storeRegion.closest('li');

        if (storeRegion.children.length <= 1) {
          li.classList.add('storeview-single-store');
          const ulParent = li.closest('ul');
          const replacedChild = (storeRegion.firstElementChild);
          replacedChild.className = 'storeview-single-store';

          ulParent.replaceChild(replacedChild, li);
          ulParent.setAttribute('tabindex', '0');
        } else {
          li.classList.add('storeview-multiple-stores');
          li.setAttribute('tabindex', '0');
        }
      });

      UI.render(Button, {
        children: `${selected.text}`,
        'data-testid': 'storeview-switcher-button',
        className: 'storeview-switcher-button',
        size: 'medium',
        variant: 'teritary',
        onClick: () => {
          showModal(storeSwitcher);
        },
      })($storeSwitcherBtn);
    }
  }
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);

  // Initialize footer accordion functionality
  initializeFooterAccordion(block);
}
