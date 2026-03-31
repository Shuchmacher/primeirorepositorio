import React, { useState, useRef } from 'react';
import { 
  Search, 
  Camera, 
  Trash2, 
  Download, 
  Plus, 
  Minus, 
  Loader2, 
  XCircle, 
  CheckCircle, 
  Upload,
  ScanEye // Alterado de Scan para ScanEye que é um ícone válido comum, ou usemos Lucide-react padrão
} from 'lucide-react';

const apiKey = ""; // A chave é injetada automaticamente pelo ambiente

const App = () => {
  const [list, setList] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Função para identificar a carta usando a IA Gemini (Visão Computacional)
  const identifyCardWithAI = async (base64Image) => {
    const systemPrompt = `Você é um scanner de cartas de Magic: The Gathering. 
    Analise a imagem e identifique o nome da carta EM INGLÊS. 
    Retorne APENAS um JSON: {"name": "Nome da Carta"}. 
    Se não for uma carta de Magic, retorne {"name": null}.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Qual é o nome desta carta de Magic?" },
              { inlineData: { mimeType: "image/png", data: base64Image } }
            ]
          }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Erro na API de Visão');
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) return null;
      
      try {
        return JSON.parse(resultText);
      } catch (e) {
        console.error("Erro ao fazer parse do JSON da IA", e);
        return null;
      }
    } catch (err) {
      console.error("Erro na identificação visual:", err);
      return null;
    }
  };

  // Lida com a foto tirada pelo celular
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setScanStatus("A analisar imagem com IA...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      // 1. Identifica o nome com a IA
      const aiResult = await identifyCardWithAI(base64);
      
      if (aiResult && aiResult.name) {
        setScanStatus(`A validar "${aiResult.name}" no Scryfall...`);
        
        // 2. Valida no Scryfall para garantir que o nome está correto e formatado
        const scryRes = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(aiResult.name)}`);
        
        if (scryRes.ok) {
          const cardData = await scryRes.ok ? await scryRes.json() : null;
          if (cardData && cardData.name) {
            addToList(cardData.name, 1);
            setScanStatus("");
          } else {
            setError("Cartão não encontrado no banco de dados oficial.");
          }
        } else {
          setError(`IA identificou "${aiResult.name}", mas o Scryfall não confirmou. Tente outra foto.`);
        }
      } else {
        setError("Não foi possível reconhecer a carta. Tente focar melhor no nome e na arte.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem.");
    } finally {
      setIsScanning(false);
      setScanStatus("");
      if (event.target) event.target.value = null;
    }
  };

  const addToList = (name, qty) => {
    setList(prev => {
      const existing = prev.find(item => item.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return prev.map(item => 
          item.name.toLowerCase() === name.toLowerCase() 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { name, quantity: qty }];
    });
  };

  const updateQty = (index, delta) => {
    setList(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (index) => {
    setList(prev => prev.filter((_, i) => i !== index));
  };

  const exportAsTxt = () => {
    const content = list.map(item => `${item.quantity} ${item.name}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decklist.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ScanEye size={20} className="text-white" />
          </div>
          MTG Scanner Pro
        </h1>
        {list.length > 0 && (
          <button onClick={exportAsTxt} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm">
            <Download size={18} /> Exportar .txt
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 max-w-2xl mx-auto w-full">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-2">
              <Camera size={32} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-bold">Escanear Nova Carta</h2>
            <p className="text-sm text-slate-400">Tire uma foto da carta inteira. A IA reconhecerá o nome automaticamente.</p>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
          >
            {isScanning ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
            {isScanning ? "Analisando..." : "Tirar Foto da Carta"}
          </button>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          {scanStatus && (
            <div className="text-sm text-blue-400 animate-pulse flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {scanStatus}
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800/50 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <XCircle size={16} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl min-h-[300px]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-slate-200">Lista de Cartas ({list.reduce((a, b) => a + b.quantity, 0)})</h3>
            {list.length > 0 && (
              <button 
                onClick={() => setList([])} 
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {list.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 text-center">
                <Upload size={40} className="mb-2" />
                <p>Nenhuma carta lida ainda.</p>
                <p className="text-xs">Use o botão acima para começar.</p>
              </div>
            ) : (
              list.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col items-center bg-slate-950 rounded-lg p-1 min-w-[36px] border border-slate-800">
                    <button onClick={() => updateQty(index, 1)} className="text-slate-500 hover:text-blue-400 transition-colors">
                      <Plus size={14} />
                    </button>
                    <span className="font-bold text-blue-500 text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(index, -1)} className="text-slate-500 hover:text-blue-400 transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>
                  <div className="flex-1 font-medium text-slate-200 truncate">{item.name}</div>
                  <button 
                    onClick={() => removeItem(index)} 
                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado!', reg))
      .catch(err => console.error('Erro ao registrar SW', err));
  });
}

export default App;