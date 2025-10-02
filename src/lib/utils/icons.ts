import { getIconData } from '@iconify/utils';
import { icons as gameIcons } from '@iconify-json/game-icons';

/**
 * Retrieves an SVG icon from the Game Icons collection.
 * @param name - Icon identifier (e.g., 'crossed-swords', 'boxing-glove')
 * @param size - Icon size in pixels (default: 32)
 * @returns SVG string if icon exists, empty string otherwise
 */
export function getSvg(name: string, size = 32): string {
  const icon = getIconData(gameIcons, name);
  if (!icon) {
    console.warn(`Icon "${name}" not found in Game Icons`);
    return '';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 ${icon.width} ${icon.height}"
               width="${size}" height="${size}">
            ${icon.body}
          </svg>`;
}