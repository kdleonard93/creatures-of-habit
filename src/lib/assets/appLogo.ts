export const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="h-12 w-12">
  <!-- Shield background -->
  <path d="M100 20 
           L160 50 
           C160 120, 140 170, 100 180
           C60 170, 40 120, 40 50 Z" 
        fill="#B72E2E"/>

  <!-- Inner shield decoration -->
  <path d="M100 30
           L150 55
           C150 115, 135 160, 100 170
           C65 160, 50 115, 50 55 Z"
        fill="none"
        stroke="#D4AF37"
        stroke-width="3"/>

  <!-- Additional shield decorations -->
  <path d="M100 40
           L140 60
           C140 110, 130 150, 100 160
           C70 150, 60 110, 60 60 Z"
        fill="none"
        stroke="#8C2323"
        stroke-width="2"/>

  <!-- Pixel-style creature -->
  <g transform="translate(65, 70)">
    <!-- Body blocks -->
    <rect x="15" y="0" width="40" height="40" fill="#D4AF37"/>
    <rect x="5" y="10" width="10" height="30" fill="#D4AF37"/>
    <rect x="55" y="10" width="10" height="30" fill="#D4AF37"/>
    <!-- Eyes -->
    <rect x="25" y="15" width="8" height="8" fill="#8C2323"/>
    <rect x="37" y="15" width="8" height="8" fill="#8C2323"/>
    <!-- Smile -->
    <rect x="25" y="30" width="20" height="5" fill="#8C2323"/>
  </g>

  <!-- Battle effects -->
  <g fill="#000000">
    <path d="M45 40 l8 -20 l8 20 l-20 -8 l20 8 Z"/>
    <path d="M145 40 l8 -20 l8 20 l-20 -8 l20 8 Z"/>
    <path d="M95 150 l8 -20 l8 20 l-20 -8 l20 8 Z"/>
  </g>

  <!-- Progress bars -->
  <g transform="translate(50, 120)">
    <!-- Background bars -->
    <rect x="0" y="-3" width="100" height="10" rx="2" fill="#000000"/>
    <!-- Progress indicators -->
    <rect x="0" y="-3" width="50" height="10" rx="2" fill="#D4AF37"/>
  </g>
</svg>`;
