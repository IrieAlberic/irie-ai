
import React from 'react';
import { Icon } from './Icon';

interface LandingPageProps {
  onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans overflow-y-auto selection:bg-accent/30 relative">
      
      {/* Background Grid */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
             <div className="w-4 h-4 bg-black rounded-sm" />
          </div>
          <span className="font-bold tracking-widest text-sm">IRIE<span className="opacity-50 font-normal">AI</span></span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-textDim">
           <span className="px-2 py-1 border border-white/10 rounded-full flex items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             v1.0.0-beta
           </span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-accent text-xs font-mono mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Icon name="Cpu" size={14} />
          <span>Local-First Retrieval Augmented Generation</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Your Knowledge.<br />
          <span className="text-white">Operating System.</span>
        </h1>

        <p className="text-lg md:text-xl text-textDim max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          Stop sending your private data to the cloud blindly. 
          IRIE indexes your documents <strong>locally in your browser</strong>, 
          allowing you to chat, visualize, and reason with your files securely.
        </p>

        <button 
          onClick={onLaunch}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-lg font-bold text-sm tracking-wide transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-in fade-in zoom-in duration-500 delay-200"
        >
          <Icon name="Power" size={18} />
          INITIALIZE SYSTEM
          <div className="absolute inset-0 border border-white/50 rounded-lg scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500" />
        </button>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-surfaceHighlight/30 border border-white/5 backdrop-blur hover:bg-surfaceHighlight/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <Icon name="Shield" size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">Zero-Trust Privacy</h3>
            <p className="text-sm text-textDim leading-relaxed">
              Documents are processed and stored in your browser's IndexedDB. 
              Choose to use local LLMs (Ollama) for a 100% offline air-gapped experience.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-surfaceHighlight/30 border border-white/5 backdrop-blur hover:bg-surfaceHighlight/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <Icon name="BrainCircuit" size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">Neural Indexing</h3>
            <p className="text-sm text-textDim leading-relaxed">
              We convert your PDF, CSV, and MD files into vector embeddings. 
              This allows the AI to "remember" and cite specific parts of your library instantly.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-surfaceHighlight/30 border border-white/5 backdrop-blur hover:bg-surfaceHighlight/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-4">
              <Icon name="LayoutDashboard" size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">Spatial Workspace</h3>
            <p className="text-sm text-textDim leading-relaxed">
              Break free from linear chat. Drag, drop, and organize your files 
              and AI responses on an infinite 2D canvas to structure your thoughts.
            </p>
          </div>

        </div>

        {/* Detailed Capabilities Section */}
        <div className="mt-32 text-left animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
            <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/50">
                System Capabilities
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Capability 1: Multi-Model */}
                <div className="p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent">
                    <div className="bg-[#09090b] rounded-xl p-6 h-full border border-white/5 relative overflow-hidden group hover:border-accent/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-accent">
                            <Icon name="Cpu" size={80} />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
                           <Icon name="Zap" className="text-accent" size={18} />
                           Multi-Model Core
                        </h3>
                        <p className="text-textDim text-sm mb-6 leading-relaxed">
                            Agnostic intelligence architecture. Switch instantly between models to balance speed, cost, and privacy.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono border border-white/10 flex items-center gap-1">
                                <Icon name="Cloud" size={10} /> Gemini 1.5
                            </span>
                            <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono border border-white/10 flex items-center gap-1">
                                <Icon name="Sparkles" size={10} /> GPT-4o
                            </span>
                            <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono border border-white/10 flex items-center gap-1">
                                <Icon name="Lock" size={10} /> Ollama (Local)
                            </span>
                            <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono border border-white/10 flex items-center gap-1">
                                <Icon name="Globe" size={10} /> OpenRouter
                            </span>
                        </div>
                    </div>
                </div>

                {/* Capability 2: Structured Data */}
                <div className="p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent">
                    <div className="bg-[#09090b] rounded-xl p-6 h-full border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-purple-500">
                            <Icon name="Database" size={80} />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
                           <Icon name="Table" className="text-purple-400" size={18} />
                           Entity Extraction
                        </h3>
                        <p className="text-textDim text-sm mb-6 leading-relaxed">
                            Turn unstructured text into structured data. IRIE automatically detects and creates tables for 
                            people, locations, metrics, and dates found in your documents.
                        </p>
                        <div className="flex gap-2">
                             <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded text-[10px] font-mono border border-purple-500/20">JSON Export</span>
                             <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded text-[10px] font-mono border border-purple-500/20">Auto-Clustering</span>
                        </div>
                    </div>
                </div>

                 {/* Capability 3: Persona Engine */}
                 <div className="md:col-span-2 p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent">
                    <div className="bg-[#09090b] rounded-xl p-6 h-full border border-white/5 relative overflow-hidden group hover:border-green-500/30 transition-colors flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 text-left">
                            <h3 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
                               <Icon name="Users" className="text-green-400" size={18} />
                               Adaptive Personas
                            </h3>
                            <p className="text-textDim text-sm leading-relaxed">
                                The system adapts its personality and reasoning style to your needs. 
                                It can act as a rigorous <strong>Data Analyst</strong> for facts, a Socratic <strong>Tutor</strong> for learning, 
                                or a Devil's Advocate <strong>Critic</strong> to challenge your assumptions.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                             <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                <Icon name="Search" className="text-blue-400" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Analyst</span>
                             </div>
                             <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                <Icon name="GraduationCap" className="text-green-400" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Tutor</span>
                             </div>
                             <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                <Icon name="Terminal" className="text-yellow-400" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Coder</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* NEW SECTION: The Neural Workflow (Selling the process) */}
        <div className="mt-32 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
             <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]" />
                
                <div className="relative p-8 md:p-12 text-left">
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-bold">4</div>
                        Steps to Intelligence
                    </h2>

                    <div className="flex flex-col md:flex-row justify-between gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />

                        {[
                            { step: '01', title: 'Ingest', icon: 'UploadCloud', desc: 'Drag & Drop PDFs, MD, or CSVs. Data stays local.' },
                            { step: '02', title: 'Index', icon: 'Cpu', desc: 'Documents are chunked and vectorized in-browser.' },
                            { step: '03', title: 'Context', icon: 'Database', desc: 'Relevant snippets are retrieved via Semantic Search.' },
                            { step: '04', title: 'Reason', icon: 'MessageSquare', desc: 'LLM synthesizes answers with citations.' }
                        ].map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center text-center group">
                                <div className="w-24 h-24 rounded-2xl bg-[#09090b] border border-white/10 flex items-center justify-center mb-6 shadow-xl group-hover:border-accent/50 group-hover:scale-110 transition-all duration-300 relative z-10">
                                    <Icon name={item.icon as any} size={32} className="text-textDim group-hover:text-white transition-colors" />
                                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-surfaceHighlight border border-white/10 flex items-center justify-center text-xs font-mono text-accent">
                                        {item.step}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-xs text-textDim max-w-[180px] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>

        {/* NEW SECTION: Footer & Social Links */}
        <footer className="mt-32 pt-16 border-t border-white/5 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-700">
            <div className="grid md:grid-cols-2 gap-12 text-left">
                
                {/* Brand & Vision */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                            <div className="w-3 h-3 bg-black rounded-sm" />
                        </div>
                        <span className="font-bold tracking-widest text-lg">IRIE<span className="opacity-50 font-normal">AI</span></span>
                    </div>
                    <p className="text-textDim text-sm leading-relaxed max-w-sm mb-8">
                        An open-source initiative to democratize local AI processing. 
                        We believe knowledge management should be private, fast, and secure by default.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-textDim/50">
                        <span>&copy; 2024 IRIE AI Systems.</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span>MIT License.</span>
                    </div>
                </div>

                {/* Connect Links */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-textDim mb-2">Connect & Contribute</h3>
                    
                    <a 
                        href="https://github.com/IrieAlberic/irie-ai" 
                        target="_blank" 
                        rel="noreferrer"
                        className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <Icon name="Github" size={20} className="text-white" />
                            <div>
                                <h4 className="font-bold text-sm text-white">GitHub Repository</h4>
                                <p className="text-xs text-textDim">Star the project, report issues, or contribute.</p>
                            </div>
                        </div>
                        <Icon name="ArrowRight" size={16} className="text-textDim group-hover:translate-x-1 transition-transform" />
                    </a>

                    <a 
                        href="https://www.linkedin.com/in/bi-iri%C3%A9-alb%C3%A9ric-tra-165724238/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-[#0077b5]/20 hover:border-[#0077b5]/50 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <Icon name="Linkedin" size={20} className="text-[#0077b5]" />
                            <div>
                                <h4 className="font-bold text-sm text-white">Let's Connect</h4>
                                <p className="text-xs text-textDim">Follow for updates on Local-First AI.</p>
                            </div>
                        </div>
                        <Icon name="ArrowRight" size={16} className="text-textDim group-hover:translate-x-1 transition-transform" />
                    </a>

                    <div className="flex gap-2 mt-2">
                        <a href="#" className="flex-1 p-3 rounded-lg bg-surfaceHighlight hover:bg-white/10 text-center text-xs font-bold text-textDim hover:text-white transition-colors">
                            Portfolio
                        </a>
                        <a href="#" className="flex-1 p-3 rounded-lg bg-surfaceHighlight hover:bg-white/10 text-center text-xs font-bold text-textDim hover:text-white transition-colors">
                            Documentation
                        </a>
                    </div>
                </div>

            </div>
        </footer>

      </main>
    </div>
  );
};
