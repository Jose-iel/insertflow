'use client';

import { useEffect, useState } from 'react';

// Mapa de fontes do Google Fonts (apenas as que não são de sistema)
const GOOGLE_FONTS_MAP: Record<string, string> = {
  'Roboto': 'Roboto:wght@100;200;300;400;500;600;700;800;900',
  'Open Sans': 'Open+Sans:wght@300;400;500;600;700;800',
  'Lato': 'Lato:wght@100;300;400;700;900',
  'Montserrat': 'Montserrat:wght@100;200;300;400;500;600;700;800;900',
  'Poppins': 'Poppins:wght@100;200;300;400;500;600;700;800;900',
  'Inter': 'Inter:wght@100;200;300;400;500;600;700;800;900',
  'Oswald': 'Oswald:wght@200;300;400;500;600;700',
  'Playfair Display': 'Playfair+Display:wght@400;500;600;700;800;900',
  'Bebas Neue': 'Bebas+Neue',
};

// Fontes de sistema (não precisam ser carregadas)
const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Impact'];

// Cache de fontes já carregadas
const loadedFonts = new Set<string>();

export function useFontLoader(fontFamily: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fontes de sistema não precisam ser carregadas
    if (SYSTEM_FONTS.includes(fontFamily)) {
      setIsLoaded(true);
      return;
    }

    // Já foi carregada anteriormente
    if (loadedFonts.has(fontFamily)) {
      setIsLoaded(true);
      return;
    }

    // Fonte não está no mapa do Google Fonts
    const googleFontQuery = GOOGLE_FONTS_MAP[fontFamily];
    if (!googleFontQuery) {
      setError(`Fonte "${fontFamily}" não encontrada`);
      return;
    }

    // Carregar fonte do Google Fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleFontQuery}&display=swap`;
    
    link.onload = () => {
      // Aguardar fonte estar realmente disponível
      document.fonts.load(`16px "${fontFamily}"`).then(() => {
        loadedFonts.add(fontFamily);
        setIsLoaded(true);
      }).catch((err) => {
        setError(`Erro ao carregar fonte: ${err.message}`);
      });
    };

    link.onerror = () => {
      setError(`Erro ao carregar fonte do Google Fonts`);
    };

    document.head.appendChild(link);

    return () => {
      // Não remover o link pois a fonte pode estar sendo usada em outros elementos
    };
  }, [fontFamily]);

  return { isLoaded, error };
}
