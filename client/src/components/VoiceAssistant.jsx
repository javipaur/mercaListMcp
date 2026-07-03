import { useState, useRef, useCallback, useEffect } from 'react';
import './VoiceAssistant.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const ORDINALS = {
  'primero': 0, 'primer': 0, 'primera': 0,
  'segundo': 1, 'segunda': 1,
  'tercero': 2, 'tercer': 2, 'tercera': 2,
  'cuarto': 3, 'cuarta': 3,
  'quinto': 4, 'quinta': 4,
  'sexto': 5, 'sexta': 5,
  'séptimo': 6, 'septimo': 6, 'séptima': 6, 'septima': 6,
  'octavo': 7, 'octava': 7,
  'noveno': 8, 'novena': 8,
  'décimo': 9, 'decimo': 9, 'décima': 9, 'decima': 9,
  'undécimo': 10, 'undecimo': 10, 'undécima': 10, 'undecima': 10,
  'duodécimo': 11, 'duodecimo': 11, 'duodécima': 11, 'duodecima': 11,
};

export default function VoiceAssistant({ onSearch, onAddItem, currentResults, pantryItems = [], lowStock = [] }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const resultsRef = useRef(currentResults);
  resultsRef.current = currentResults;
  const pantryRef = useRef(pantryItems);
  pantryRef.current = pantryItems;
  const lowStockRef = useRef(lowStock);
  lowStockRef.current = lowStock;
  const inactivityTimer = useRef(null);
  const restartTimer = useRef(null);
  const setupRef = useRef(null);

  function relisten() {
    stopListening();
    setTimeout(() => {
      setListening(true);
      setupRef.current?.();
    }, 100);
    const fallbackTimer = setTimeout(() => {
      if (!recognitionRef.current) {
        setListening(false);
      }
    }, 8000);
    inactivityTimer.current = fallbackTimer;
  }

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearInactivityTimer();
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  }, [clearInactivityTimer]);

  const setupRecognition = useCallback(() => {
    if (recognitionRef.current) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let done = false;

      recognition.onresult = async (event) => {
        if (done) return;
        done = true;
        const text = event.results[0][0].transcript;
        setTranscript(text);
        clearInactivityTimer();

        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          try { recognitionRef.current.abort(); } catch {}
          recognitionRef.current = null;
        }

        const command = parseCommand(text, resultsRef.current, pantryRef.current, lowStockRef.current);

        if (command.type === 'add_nth') {
          onAddItem(command.product);
          setResponse(`He añadido ${command.product.name} a tu lista.`);
          const msg = `Vale, he añadido ${command.product.name} a tu lista. Puedes decir "busca leche" para buscar otro producto, o "añade el segundo" para añadir otro de los resultados.`;
          speakText(msg, 1.1, () => {
            restartTimer.current = setTimeout(relisten, 600);
          });
          return;
        }

        if (command.type === 'pantry_status') {
          const pantry = pantryRef.current;
          const low = lowStockRef.current;
          if (pantry.length === 0) {
            setResponse('No tienes nada en la bodega aún.');
            speakText('No tienes nada en la bodega aún. Ve comprando productos para llenarla.', 1.1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          } else {
            const names = pantry.slice(0, 8).map(i => `${i.name} (${i.stock})`);
            const msg = `Tienes ${pantry.length} producto${pantry.length !== 1 ? 's' : ''} en la bodega. ${low.length > 0 ? low.length + ' con poco stock. ' : ''}Los que más tienes: ${names.join(', ')}.`;
            setResponse(msg);
            speakText(msg, 1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          }
          return;
        }

        if (command.type === 'low_stock') {
          const low = lowStockRef.current;
          if (low.length === 0) {
            setResponse('No tienes productos con poco stock.');
            speakText('No tienes productos con poco stock. Todo está bien abastecido.', 1.1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          } else {
            const names = low.map(i => `${i.name} (te quedan ${i.stock})`);
            const msg = `Tienes ${low.length} producto${low.length !== 1 ? 's' : ''} a punto de agotarse: ${names.join(', ')}. Puedes añadirlos a la lista diciendo "añade" y el nombre.`;
            setResponse(msg);
            speakText(msg, 1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          }
          return;
        }

        if (command.type === 'check_stock') {
          const pantry = pantryRef.current;
          const found = pantry.find(i => i.name.toLowerCase().includes(command.query));
          if (found) {
            const msg = `Tienes ${found.stock} unidad${found.stock !== 1 ? 'es' : ''} de ${found.name} en la bodega.`;
            setResponse(msg);
            speakText(msg, 1.1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          } else {
            const msg = `No encontré "${command.query}" en tu bodega. Puedes buscarlo diciendo "busca ${command.query}".`;
            setResponse(msg);
            speakText(msg, 1.1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          }
          return;
        }

        try {
          const results = await onSearch(command.query);

          if (results && results.length > 0) {
            const top = results.slice(0, 3);
            const names = top.map(p => p.name);
            const first = top[0];

            if (command.type === 'search_and_add') {
              onAddItem(first);
              setResponse(`He añadido ${first.name} a tu lista.`);
              speakText(`Vale, he añadido ${first.name} a tu lista. Puedes decir "busca leche" para buscar otro producto.`, 1.1, () => {
                restartTimer.current = setTimeout(relisten, 600);
              });
              return;
            } else {
              setResponse(`He encontrado ${results.length} productos para ${command.query}.`);
              const msg = `He encontrado ${results.length} productos para ${command.query}. Los primeros son: ${names.slice(0, 3).join(', ')}. Di cuál quieres y lo añado a la cesta, o di "busca" más el nombre de otro producto.`;
              speakText(msg, 1, () => {
                restartTimer.current = setTimeout(relisten, 600);
              });
            }
          } else {
            setResponse(`No encontré nada para "${command.query}"`);
            speakText(`Lo siento, no encontré ningún producto para ${command.query}. Prueba con otro nombre.`, 1.1, () => {
              restartTimer.current = setTimeout(relisten, 600);
            });
          }
        } catch {
          setResponse('Hubo un error al buscar');
          speakText('Hubo un error. Inténtalo de nuevo.', 1.1, () => {
            restartTimer.current = setTimeout(relisten, 600);
          });
        }
      };

      recognition.onerror = () => {
        if (done) return;
        done = true;
        clearInactivityTimer();
        if (recognitionRef.current === recognition) {
          recognitionRef.current.onend = null;
          try { recognitionRef.current.abort(); } catch {}
          recognitionRef.current = null;
        }
        setListening(false);
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('VoiceAssistant setup error:', err);
      setListening(false);
    }
  }, [onSearch, onAddItem, clearInactivityTimer]);

  setupRef.current = setupRecognition;

  function speakText(text, rate = 1.1, onDone) {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = rate;

    let fired = false;
    const safeDone = () => {
      if (fired) return;
      fired = true;
      if (onDone) onDone();
    };
    utterance.onend = safeDone;
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      safeDone();
    };

    synthRef.current.cancel();
    synthRef.current.speak(utterance);

    const estimatedMs = Math.min(text.length * 180 + 1500, 15000);
    setTimeout(() => {
      if (!fired) safeDone();
    }, estimatedMs);
  }

  function parseCommand(text, visibleResults, pantryItems = [], lowStock = []) {
    const lower = text.toLowerCase().trim();

    const addPrefix = /^(añade|añadir|pon|agrega|agregar|meter)\s+/i;
    const addPrefixMatch = lower.match(addPrefix);
    if (addPrefixMatch) {
      const rest = lower.slice(addPrefixMatch[0].length).trim();
      const simpleOrdinal = /^(?:(?:el|él)\s+)?(?:producto\s+|n[úu]mero\s+|num\s+|nº\s+)?(\d+|[\wáéíóú]+)\s*(?:º|\.|o|a|er)?(?:\s+producto)?(?:\s+a\s+la\s+lista)?$/i;
      const ordMatch = rest.match(simpleOrdinal);
      if (ordMatch) {
        const ref = ordMatch[1].toLowerCase();
        const num = parseInt(ref, 10);
        let idx = -1;
        if (!isNaN(num) && num >= 1 && num <= 15) {
          idx = num - 1;
        } else if (ORDINALS[ref] !== undefined) {
          idx = ORDINALS[ref];
        }
        if (idx >= 0 && visibleResults && idx < visibleResults.length) {
          return { type: 'add_nth', index: idx, product: visibleResults[idx] };
        }
      }
      return { type: 'search_and_add', query: rest.replace(/\s+a\s+la\s+lista$/i, '') };
    }

    const ordinalOnly = /^(?:(?:el|él)\s+)?(?:producto\s+|n[úu]mero\s+|num\s+|nº\s+)?(\d+|[\wáéíóú]+)\s*(?:º|\.|o|a|er)?(?:\s+producto)?(?:\s+de\s+la\s+lista)?$/i;
    const ordMatch = lower.match(ordinalOnly);
    if (ordMatch) {
      const ref = ordMatch[1].toLowerCase();
      const num = parseInt(ref, 10);
      let idx = -1;
      if (!isNaN(num) && num >= 1 && num <= 15) {
        idx = num - 1;
      } else if (ORDINALS[ref] !== undefined) {
        idx = ORDINALS[ref];
      }
      if (idx >= 0 && visibleResults && idx < visibleResults.length) {
        return { type: 'add_nth', index: idx, product: visibleResults[idx] };
      }
    }

    const searchMatch = lower.match(/^(busca|buscar|quiero|necesito|comprar|dime|encuentra)\s+(.+)/i);
    if (searchMatch) return { type: 'search', query: searchMatch[2] };

    const infoMatch = lower.match(/^(que hay de|dime sobre|cuéntame de|información de|precio del)\s+(.+)/i);
    if (infoMatch) return { type: 'search', query: infoMatch[2] };

    if (/^(qué\s+)?(tengo\s+)?(en\s+la\s+)?(bodega|dispensa|despensa|nevera|alacena)(\s+tengo)?$/i.test(lower)) {
      return { type: 'pantry_status' };
    }

    if (/^(qué\s+)?(se\s+(me\s+)?)?(está\s+)?(acabando|agotando)|(poco|bajo)\s+stock|apunto\s+de\s+(acabar|agotar)(se)?|(qué\s+)?(me\s+)?(falta)/i.test(lower)) {
      return { type: 'low_stock' };
    }

    const stockMatch = lower.match(/^(cuánt[oa]s?\s+)?(.+?)\s+(tengo|hay|tenemos)(\s+en\s+la\s+(bodega|dispensa|despensa))?$/i);
    if (stockMatch) {
      const query = stockMatch[2].trim();
      if (query && query.length > 1) {
        return { type: 'check_stock', query };
      }
    }

    const tengoMatch = lower.match(/^tengo\s+(.+?)\s*(en\s+la\s+(bodega|dispensa|despensa))?$/i);
    if (tengoMatch && !/^(busca|buscar|quiero|necesito|comprar|dime|encuentra)/i.test(lower)) {
      const query = tengoMatch[1].trim();
      const found = pantryItems.find(i => i.name.toLowerCase().includes(query));
      if (found) return { type: 'check_stock', query };
    }

    return { type: 'search', query: lower };
  }

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      const msg = 'Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.';
      setResponse(msg);
      speakText(msg);
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    setTranscript('');
    setResponse('');
    clearInactivityTimer();
    stopListening();
    setListening(true);
    setupRecognition();
  }, [listening, clearInactivityTimer, stopListening, setupRecognition]);

  useEffect(() => {
    return () => {
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      synthRef.current.cancel();
    };
  }, []);

  return (
    <div className={`voice-assistant${listening ? ' listening' : ''}`}>
      <button
        className="voice-btn"
        onClick={startListening}
        disabled={listening}
        aria-label={listening ? 'Escuchando...' : 'Activar asistente de voz'}
        title="Asistente de voz"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
          />
        </svg>
      </button>
      {listening && (
        <span className="voice-pulse" aria-hidden="true">
          <span className="voice-pulse-dot" />
          <span className="voice-pulse-dot" />
          <span className="voice-pulse-dot" />
        </span>
      )}
      <div className="voice-status" role="status" aria-live="polite">
        {listening && <span className="voice-listening-text">Escuchando...</span>}
        {response && !listening && <span className="voice-response-text">{response}</span>}
      </div>
    </div>
  );
}
