/**
 * Decorative night-city scene for the login screens: a taxi, a dotted route
 * between two map pins and a "driver is on the way" card. Pure SVG, so it
 * needs no image file and scales to any screen.
 */
export default function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
            <linearGradient id="lb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#070b17"/>
              <stop offset="0.6" stopColor="#111a2e"/>
              <stop offset="1" stopColor="#1d2a4a"/>
            </linearGradient>
            <radialGradient id="lb-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ff9933" stopOpacity="0.42"/>
              <stop offset="1" stopColor="#ff9933" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="lb-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb347"/>
              <stop offset="1" stopColor="#ff8a1f"/>
            </linearGradient>
            <linearGradient id="lb-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff3cf" stopOpacity="0.55"/>
              <stop offset="1" stopColor="#fff3cf" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lb-vignette" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#070b17" stopOpacity="0.75"/>
              <stop offset="0.5" stopColor="#070b17" stopOpacity="0"/>
            </linearGradient>
            <pattern id="lb-windows" width="24" height="28" patternUnits="userSpaceOnUse">
              <rect x="7" y="8" width="9" height="12" rx="1.5" fill="#ffc46b" opacity="0.7"/>
            </pattern>
            <clipPath id="lb-nearBuildings">
              <rect x="0" y="600" width="130" height="100"/>
              <rect x="130" y="640" width="100" height="60"/>
              <rect x="230" y="580" width="90" height="120"/>
              <rect x="320" y="630" width="120" height="70"/>
              <rect x="440" y="610" width="90" height="90"/>
              <rect x="530" y="650" width="190" height="50"/>
              <rect x="720" y="600" width="100" height="100"/>
              <rect x="820" y="640" width="110" height="60"/>
              <rect x="930" y="590" width="90" height="110"/>
              <rect x="1020" y="630" width="130" height="70"/>
              <rect x="1150" y="600" width="100" height="100"/>
              <rect x="1250" y="640" width="110" height="60"/>
              <rect x="1360" y="580" width="110" height="120"/>
              <rect x="1470" y="620" width="130" height="80"/>
            </clipPath>
          </defs>
        
          <rect width="1600" height="900" fill="url(#lb-sky)"/>
          <ellipse cx="800" cy="660" rx="900" ry="420" fill="url(#lb-glow)"/>
          <g fill="#fff" opacity="0.6">
            <circle cx="90" cy="80" r="1.6"/><circle cx="240" cy="150" r="1.2"/><circle cx="410" cy="60" r="1.6"/>
            <circle cx="560" cy="120" r="1.2"/><circle cx="700" cy="70" r="1.6"/><circle cx="860" cy="40" r="1.2"/>
            <circle cx="1120" cy="90" r="1.6"/><circle cx="1260" cy="150" r="1.2"/><circle cx="1400" cy="60" r="1.6"/>
            <circle cx="1530" cy="130" r="1.2"/><circle cx="1480" cy="230" r="1.6"/><circle cx="60" cy="260" r="1.2"/>
          </g>
          <circle cx="1010" cy="130" r="110" fill="#ff9933" opacity="0.06"/>
          <circle cx="1010" cy="130" r="62" fill="#ffc078" opacity="0.9"/>
          
          <g fill="#15213d">
            <rect x="0" y="520" width="90" height="140"/><rect x="90" y="470" width="70" height="190"/>
            <rect x="160" y="540" width="100" height="120"/><rect x="260" y="450" width="80" height="210"/>
            <rect x="340" y="500" width="110" height="160"/><rect x="450" y="560" width="90" height="100"/>
            <rect x="540" y="480" width="70" height="180"/><rect x="610" y="530" width="100" height="130"/>
            <rect x="710" y="440" width="80" height="220"/><rect x="790" y="510" width="110" height="150"/>
            <rect x="900" y="470" width="70" height="190"/><rect x="970" y="540" width="100" height="120"/>
            <rect x="1070" y="450" width="90" height="210"/><rect x="1160" y="520" width="80" height="140"/>
            <rect x="1240" y="480" width="100" height="180"/><rect x="1340" y="540" width="90" height="120"/>
            <rect x="1430" y="460" width="80" height="200"/><rect x="1510" y="520" width="90" height="140"/>
          </g>
          <g fill="#1f2f55">
            <rect x="560" y="520" width="140" height="140"/>
            <path d="M570 520 a60 60 0 0 1 120 0 z"/>
            <rect x="628" y="446" width="4" height="16"/><circle cx="630" cy="442" r="5"/>
            <rect x="546" y="470" width="12" height="190"/><circle cx="552" cy="466" r="8"/>
            <rect x="702" y="470" width="12" height="190"/><circle cx="708" cy="466" r="8"/>
          </g>
          <g fill="#ffc46b" opacity="0.8">
            <rect x="585" y="560" width="10" height="22" rx="5"/><rect x="625" y="560" width="10" height="22" rx="5"/>
            <rect x="665" y="560" width="10" height="22" rx="5"/>
          </g>
        
          <g clipPath="url(#lb-nearBuildings)">
            <rect x="0" y="560" width="1600" height="140" fill="#0d1426"/>
            <rect x="0" y="560" width="1600" height="140" fill="url(#lb-windows)"/>
            <g fill="#0d1426" opacity="0.7">
              <rect x="60" y="600" width="70" height="60"/><rect x="250" y="590" width="40" height="80"/>
              <rect x="760" y="610" width="50" height="60"/><rect x="960" y="600" width="50" height="70"/>
              <rect x="1180" y="610" width="60" height="60"/><rect x="1400" y="590" width="60" height="70"/>
            </g>
          </g>
        
          <rect x="0" y="700" width="1600" height="200" fill="#0a0f1e"/>
          <rect x="0" y="700" width="1600" height="6" fill="#1d2a4a"/>
          <line x1="0" y1="815" x2="1600" y2="815" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeDasharray="60 44"/>
          <ellipse cx="740" cy="800" rx="300" ry="22" fill="#ff9933" opacity="0.2"/>
        
          <g stroke="#2a3756" strokeWidth="5">
            <line x1="300" y1="700" x2="300" y2="590"/><line x1="1000" y1="700" x2="1000" y2="590"/><line x1="1460" y1="700" x2="1460" y2="590"/>
          </g>
          <g fill="#ffd9a8">
            <circle cx="300" cy="586" r="8"/><circle cx="1000" cy="586" r="8"/><circle cx="1460" cy="586" r="8"/>
          </g>
          <g fill="#ffb066" opacity="0.1">
            <circle cx="300" cy="586" r="34"/><circle cx="1000" cy="586" r="34"/><circle cx="1460" cy="586" r="34"/>
          </g>
        
          <path d="M470 470 C 600 290, 900 290, 1060 400" fill="none" stroke="#ff9933" strokeWidth="6" strokeDasharray="1 16" strokeLinecap="round"/>
          <g transform="translate(470 470)">
            <ellipse cx="0" cy="2" rx="14" ry="5" fill="none" stroke="#2db84d" strokeWidth="3">
              <animate attributeName="rx" values="10;38;10" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="4;13;4" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite"/>
            </ellipse>
            <path d="M0 0 C-14 -18 -22 -28 -22 -40 A22 22 0 1 1 22 -40 C22 -28 14 -18 0 0 Z" fill="#138808" stroke="#fff" strokeWidth="3"/>
            <circle cy="-40" r="8" fill="#fff"/>
          </g>
          <g transform="translate(1060 400)">
            <ellipse cx="0" cy="2" rx="14" ry="5" fill="none" stroke="#ff9933" strokeWidth="3">
              <animate attributeName="rx" values="10;38;10" dur="2.4s" begin="1.2s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="4;13;4" dur="2.4s" begin="1.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" begin="1.2s" repeatCount="indefinite"/>
            </ellipse>
            <path d="M0 0 C-14 -18 -22 -28 -22 -40 A22 22 0 1 1 22 -40 C22 -28 14 -18 0 0 Z" fill="#ff9933" stroke="#fff" strokeWidth="3"/>
            <rect x="-8" y="-48" width="16" height="16" rx="3" fill="#fff"/>
          </g>
        
          <g>
            <rect x="620" y="170" width="300" height="100" rx="22" fill="#111a2e" fillOpacity="0.92" stroke="#fff" strokeOpacity="0.14"/>
            <circle cx="664" cy="214" r="24" fill="#ff9933"/>
            <rect x="652" y="212" width="24" height="9" rx="3" fill="#0a0f1e"/>
            <path d="M656 212 l5 -8 h10 l5 8 z" fill="#0a0f1e"/>
            <circle cx="659" cy="223" r="3.2" fill="#fff"/><circle cx="670" cy="223" r="3.2" fill="#fff"/>
            <text x="704" y="208" fill="#fff" fontSize="18" fontWeight="700" fontFamily="Poppins, sans-serif">Driver is on the way</text>
            <text x="704" y="231" fill="#ffc078" fontSize="15" fontFamily="Poppins, sans-serif">Arriving in 3 min</text>
            <rect x="704" y="247" width="190" height="6" rx="3" fill="#2a3756"/>
            <rect x="704" y="247" width="124" height="6" rx="3" fill="#ff9933"/>
          </g>
        
          <g transform="translate(560 690) scale(1.3)">
            <polygon points="272,54 430,26 430,102 272,64" fill="url(#lb-beam)"/>
            <path d="M10 70 L10 52 Q10 42 24 40 L58 34 L82 12 Q86 8 94 8 L168 8 Q178 8 184 14 L206 36 L248 42 Q268 46 270 60 L270 72 Q270 78 264 78 L16 78 Q10 78 10 70 Z" fill="url(#lb-body)"/>
            <polygon points="90,15 134,15 134,35 68,35" fill="#12203d"/>
            <path d="M142 15 L168 15 Q173 15 176 19 L192 35 L142 35 Z" fill="#12203d"/>
            <polygon points="90,15 104,15 82,35 68,35" fill="#fff" opacity="0.12"/>
            <line x1="138" y1="14" x2="138" y2="70" stroke="#000" strokeOpacity="0.25" strokeWidth="2"/>
            <rect x="122" y="46" width="12" height="3" rx="1.5" fill="#000" opacity="0.35"/>
            <rect x="14" y="60" width="252" height="6" fill="#138808"/>
            <rect x="112" y="-4" width="42" height="12" rx="3" fill="#fff"/>
            <text x="133" y="5" fill="#0a0f1e" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="Poppins, sans-serif">TAXI</text>
            <ellipse cx="265" cy="52" rx="6" ry="4" fill="#fff8e1"/>
            <rect x="8" y="48" width="5" height="10" rx="2" fill="#ff3b3b"/>
            <circle cx="62" cy="80" r="17" fill="#0a0f1e"/><circle cx="62" cy="80" r="8" fill="#3d4b6e"/><circle cx="62" cy="80" r="3" fill="#8b9bbf"/>
            <circle cx="222" cy="80" r="17" fill="#0a0f1e"/><circle cx="222" cy="80" r="8" fill="#3d4b6e"/><circle cx="222" cy="80" r="3" fill="#8b9bbf"/>
          </g>
        
          <rect width="1600" height="900" fill="url(#lb-vignette)"/>
      </svg>

      {/* Headline on wide screens, to the left of the login card */}
      <div className="absolute left-16 top-[26%] hidden max-w-lg xl:block">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-semibold text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Cab booking made simple
        </p>

        <h2 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight text-white">
          Your ride,
          <br />
          <span className="text-cyan-400">one tap</span> away.
        </h2>

        <p className="mt-4 max-w-md text-base text-slate-300">
          Book a cab, follow the route on the map and rate your driver.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {["Instant fare estimate", "Route on the map", "Rate your driver"].map(
            (label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-slate-200"
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
