  ---                                                                                                                                                                                       
  Muffin+TW+Vite vs React+TW+Vite                                                                                                                                                           
                                                                                                                                                                                            
  ▎ Scoring purely on tech, DX, and implementation quality — not ecosystem popularity.                                                                                                      
                                                                                                                                                                                            
  ┌───────────────────────┬────────┬───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐          
  │       Dimension       │ Muffin │ React │                                                                Notes                                                                │          
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Developer Experience  │ 5      │ 8     │ Template literals in JS strings = no IDE HTML support, no autocomplete, easy to miss a backtick and get a cryptic error             │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Composability         │ 5      │ 9     │ Passing data between Muffin components requires attributes-as-strings or PostOffice; React props/context is clean and typed         │          
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Reactivity / State    │ 4      │ 8     │ uiVars + manual render() calls vs hooks. No derived state, no efficient update granularity in Muffin                                │          
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Type safety           │ 3      │ 8     │ Muffin projects are JS-only in practice; string-based on-click="methodName" has zero type checking                                  │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Markup authoring      │ 4      │ 8     │ HTML-in-template-literals is error-prone and has latent XSS risk (no sanitization layer). JSX is type-checked and editor-aware      │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Vite integration      │ 6      │ 9     │ Muffin needs a hand-rolled prerender plugin, polyfills file, CDN SDK load. React has first-class @vitejs/plugin-react + HMR         │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Flexibility / Control │ 8      │ 7     │ Muffin wins here — you can wire up anything, the PostOffice pub/sub and state machine patterns are genuinely interesting primitives │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Performance ceiling   │ 7      │ 7     │ Tie for landing pages. Muffin avoids vDOM overhead but the full-string re-render via markupFunc isn't much smarter for dynamic UIs  │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Maintainability       │ 4      │ 8     │ Custom framework = tribal knowledge. Polyfills file signals the framework is still maturing. Any React dev can read React cold      │        
  ├───────────────────────┼────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤          
  │ Onboarding            │ 3      │ 9     │ Muffin is a black box to anyone outside Footloose Labs                                                                              │        
  └───────────────────────┴────────┴───────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘          
                                                                                                                                                                                          
  Overall: Muffin ~5/10 — React ~8/10                                                                                                                                                       
                                                                                                                                                                                          
  ---                                                                                                                                                                                       
  Honest summary                                                                                                                                                                          
                                                                                                                                                                                            
  Muffin is doing real work — the render-at-route, PostOffice, surface animations, state machine, SSR prerender plugin — these show genuine engineering thought. It's not a toy. But it's
  re-inventing wheels React has already perfected, with less polish, less safety, and a much steeper learning curve for anyone new.                                                         
                                                                                                                                                                                          
  Where Muffin actually wins:                                                                                                                                                               
  - The atom-websdk / PostOffice / WebInterface layer is broader than a UI framework — it's a full client-side platform. React doesn't compete there. If Muffin is the shell around that  
  SDK, that's a legitimate reason to keep it.                                                                                                                                               
  - No virtual DOM for content that's mostly static is slightly leaner.
  - The render-at-route + SSR prerender approach for landing pages is clever and keeps SEO clean without needing Next.js.                                                                   
                                                                                                                                                                                            
  Where it loses badly:                                                                                                                                                                     
  - The static markupFunc returning a raw HTML string, requiring _constructor to be passed in, is an architectural awkwardness that React avoids entirely with JSX.                         
  - Every time you write a component you're back to manually managing render cycles, which is work React does for free.                                                                     
  - No TypeScript in the Muffin projects — this is a meaningful gap as the codebase grows.                                                                                                
                                                                                                                                                                                            
  My actual recommendation: Keep Muffin for pages that are tightly coupled to the atom-websdk / PostOffice layer (the main wity.ai app shell, tools that need the full platform). Use React 
  for standalone landing pages and tool pages — you've already made that call correctly with jity-photo-studio, jity-dam, and the affiliate page, and those pages are noticeably cleaner as 
  a result. 