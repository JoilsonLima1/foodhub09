// Map of product image filenames to their imported ES6 modules
// This is necessary because images in src/assets need to be imported

import batataFrita from '@/assets/products/batata-frita.jpg';
import brownieSorvete from '@/assets/products/brownie-sorvete.jpg';
import burgerBacon from '@/assets/products/burger-bacon.jpg';
import burgerClassico from '@/assets/products/burger-classico.jpg';
import burgerPulledPork from '@/assets/products/burger-pulled-pork.jpg';
import burgerVeggie from '@/assets/products/burger-veggie.jpg';
import cafeGelado from '@/assets/products/cafe-gelado.jpg';
import cheesecake from '@/assets/products/cheesecake.jpg';
import chickenWings from '@/assets/products/chicken-wings.jpg';
import limonada from '@/assets/products/limonada.jpg';
import mozzarellaSticks from '@/assets/products/mozzarella-sticks.jpg';
import onionRings from '@/assets/products/onion-rings.jpg';
import petitGateau from '@/assets/products/petit-gateau.jpg';
import pizzaFrango from '@/assets/products/pizza-frango.jpg';
import pizzaMargherita from '@/assets/products/pizza-margherita.jpg';
import pizzaPepperoni from '@/assets/products/pizza-pepperoni.jpg';
import pizzaQuatroQueijos from '@/assets/products/pizza-quatro-queijos.jpg';
import refrigeranteCola from '@/assets/products/refrigerante-cola.jpg';
import smoothieTropical from '@/assets/products/smoothie-tropical.jpg';
import sucoLaranja from '@/assets/products/suco-laranja.jpg';

const productImageMap: Record<string, string> = {
  'batata-frita.jpg': batataFrita,
  'brownie-sorvete.jpg': brownieSorvete,
  'burger-bacon.jpg': burgerBacon,
  'burger-classico.jpg': burgerClassico,
  'burger-pulled-pork.jpg': burgerPulledPork,
  'burger-veggie.jpg': burgerVeggie,
  'cafe-gelado.jpg': cafeGelado,
  'cheesecake.jpg': cheesecake,
  'chicken-wings.jpg': chickenWings,
  'limonada.jpg': limonada,
  'mozzarella-sticks.jpg': mozzarellaSticks,
  'onion-rings.jpg': onionRings,
  'petit-gateau.jpg': petitGateau,
  'pizza-frango.jpg': pizzaFrango,
  'pizza-margherita.jpg': pizzaMargherita,
  'pizza-pepperoni.jpg': pizzaPepperoni,
  'pizza-quatro-queijos.jpg': pizzaQuatroQueijos,
  'refrigerante-cola.jpg': refrigeranteCola,
  'smoothie-tropical.jpg': smoothieTropical,
  'suco-laranja.jpg': sucoLaranja,
};

/**
 * Resolves a product image URL to an actual usable URL.
 * Handles:
 * - Local asset paths like "/src/assets/products/pizza.jpg"
 * - Relative paths like "products/pizza.jpg"
 * - Full URLs (returned as-is)
 * - Storage bucket URLs (returned as-is)
 */
export function resolveProductImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  // If it's already an HTTP URL (external or storage), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Extract filename from path
  const filename = imageUrl.split('/').pop();
  if (!filename) return null;

  // Check if we have this image in our local map
  if (productImageMap[filename]) {
    return productImageMap[filename];
  }

  // If not found in map but starts with /src/assets, it's a broken local reference
  if (imageUrl.includes('/src/assets/')) {
    return null;
  }

  // Return original URL for any other case (might be a public folder path)
  return imageUrl;
}
