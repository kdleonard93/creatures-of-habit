import type { CreatureRaceType } from '$lib/types';

const orcIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <g transform="scale(0.5)">
    <!-- Base Head Shape -->
    <path d="M100 30 
             C60 30, 30 70, 30 110
             C30 150, 60 180, 100 180
             C140 180, 170 150, 170 110
             C170 70, 140 30, 100 30Z" 
          fill="#2D5A27" />
    
    <!-- Jaw Detail -->
    <path d="M65 120
             C65 150, 100 160, 100 160
             C100 160, 135 150, 135 120
             C135 110, 100 130, 65 120Z"
          fill="#1A3517" />
    
    <!-- Eyes -->
    <circle cx="70" cy="80" r="8" fill="#8B0000">
      <animate attributeName="fill"
               values="#8B0000;#FF0000;#8B0000"
               dur="2s"
               repeatCount="indefinite"/>
    </circle>
    <circle cx="130" cy="80" r="8" fill="#8B0000">
      <animate attributeName="fill"
               values="#8B0000;#FF0000;#8B0000"
               dur="2s"
               repeatCount="indefinite"/>
    </circle>
    
    <!-- Tusks -->
    <path d="M70 120 C70 120, 65 140, 60 145 C55 150, 65 155, 70 150 C75 145, 75 120, 70 120Z" fill="#FFFFFF" />
    <path d="M130 120 C130 120, 135 140, 140 145 C145 150, 135 155, 130 150 C125 145, 125 120, 130 120Z" fill="#FFFFFF" />
    
    <!-- Helmet -->
    <path d="M40 70 C40 40, 100 20, 160 70 C160 60, 100 10, 40 70Z"
          fill="#1B3F8B" opacity="0.9" />
  </g>
</svg>`;

const humanIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <g transform="scale(0.5)">
    <!-- Base Head Shape -->
    <path d="M100 30 
             C60 30, 30 70, 30 110
             C30 150, 60 180, 100 180
             C140 180, 170 150, 170 110
             C170 70, 140 30, 100 30Z" 
          fill="#E8B59E" />
    
    <!-- Jaw Detail -->
    <path d="M65 120
             C65 150, 100 160, 100 160
             C100 160, 135 150, 135 120
             C135 110, 100 130, 65 120Z"
          fill="#D3927C" />
    
    <!-- Eyes -->
    <path d="M70 80 C70 70, 85 70, 85 80 C85 90, 70 90, 70 80Z" fill="#4B3621" />
    <path d="M115 80 C115 70, 130 70, 130 80 C130 90, 115 90, 115 80Z" fill="#4B3621" />
    
    <!-- Warrior Helm -->
    <path d="M40 70 C40 40, 100 20, 160 70 C160 60, 100 10, 40 70Z"
          fill="#919191" opacity="0.9" />
    <path d="M50 70 L150 70" stroke="#747474" stroke-width="4" />
  </g>
</svg>`;

const elfIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <g transform="scale(0.5)">
    <!-- Base Head Shape with Pointed Ears -->
    <path d="M100 30 
             C60 30, 30 70, 30 110
             C30 150, 60 180, 100 180
             C140 180, 170 150, 170 110
             C170 70, 140 30, 100 30
             M30 90 L15 70 L35 85
             M170 90 L185 70 L165 85Z" 
          fill="#FFE5D9" />
    
    <!-- Jaw Detail -->
    <path d="M65 120
             C65 150, 100 160, 100 160
             C100 160, 135 150, 135 120
             C135 110, 100 130, 65 120Z"
          fill="#FFD1C1" />
    
    <!-- Almond Eyes -->
    <path d="M65 80 C65 70, 90 65, 90 80 C90 95, 65 90, 65 80Z" fill="#4FA69A" />
    <path d="M110 80 C110 70, 135 65, 135 80 C135 95, 110 90, 110 80Z" fill="#4FA69A" />
    
    <!-- Circlet -->
    <path d="M40 60 C40 60, 100 40, 160 60" 
          fill="none" stroke="#C0C0C0" stroke-width="3" />
    <circle cx="100" cy="50" r="5" fill="#4FA69A" />
  </g>
</svg>`;

const dwarfIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <g transform="scale(0.5)">
    <!-- Base Head Shape -->
    <path d="M100 40 
             C60 40, 30 80, 30 120
             C30 160, 60 180, 100 180
             C140 180, 170 160, 170 120
             C170 80, 140 40, 100 40Z" 
          fill="#E8C59E" />
    
    <!-- Massive Beard -->
    <path d="M40 100
             C40 140, 100 170, 100 170
             C100 170, 160 140, 160 100
             C160 90, 100 140, 40 100
             L30 180 L170 180 L160 100Z"
          fill="#8B4513" />
    
    <!-- Eyes -->
    <path d="M70 80 C70 70, 85 70, 85 80 C85 90, 70 90, 70 80Z" fill="#4B3621" />
    <path d="M115 80 C115 70, 130 70, 130 80 C130 90, 115 90, 115 80Z" fill="#4B3621" />
    
    <!-- Helmet -->
    <path d="M40 70 C40 40, 100 20, 160 70 C160 60, 100 10, 40 70Z"
          fill="#CD7F32" opacity="0.9" />
    <path d="M50 70 L150 70" stroke="#A0522D" stroke-width="6" />
    
    <!-- Beard Braids -->
    <path d="M60 140 C60 160, 70 170, 70 180" stroke="#8B4513" stroke-width="4" fill="none" />
    <path d="M140 140 C140 160, 130 170, 130 180" stroke="#8B4513" stroke-width="4" fill="none" />
  </g>
</svg>`;

export const raceIcons: Record<CreatureRaceType, string> = {
    human: humanIcon,
    orc: orcIcon,
    elf: elfIcon,
    dwarf: dwarfIcon
};

export { humanIcon, orcIcon, elfIcon, dwarfIcon };