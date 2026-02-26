'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@insertflow/ui';

export function HelpTooltip() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Ajuda"
        className="text-gray-500 hover:text-gray-700"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Como usar o Editor de Templates</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Introdução */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">📋 O que é um Template?</h3>
                <p className="text-sm text-gray-600">
                  Um template é um modelo visual que será preenchido automaticamente com os dados dos seus produtos 
                  para gerar encartes. As <strong>formas e decorações</strong> são fixas, mas os <strong>textos e imagens</strong> podem 
                  ser dinâmicos usando variáveis.
                </p>
              </section>

              {/* Variáveis */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">🔤 Variáveis de Texto</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Use estas variáveis nos campos de texto. Elas serão substituídas pelos dados reais dos produtos:
                </p>
                <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                  <div><code className="bg-blue-100 px-1 rounded">{'{{nome_produto_N}}'}</code> → Nome do produto</div>
                  <div><code className="bg-blue-100 px-1 rounded">{'{{preco_produto_N}}'}</code> → Preço do produto</div>
                  <div><code className="bg-blue-100 px-1 rounded">{'{{descricao_produto_N}}'}</code> → Descrição do produto</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>N</strong> = número do slot (1, 2, 3...). Ex: Se o template tem 3 produtos, use _1, _2 e _3.
                </p>
              </section>

              {/* Imagens */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">🖼️ Variáveis de Imagem</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Para elementos de imagem, use o campo "Variável" no painel de propriedades:
                </p>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <code className="bg-green-100 px-1 rounded">{'{{imagem_produto_N}}'}</code> → Imagem do produto N
                </div>
              </section>

              {/* Background */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">🎨 Fundo do Template</h3>
                <p className="text-sm text-gray-600">
                  O fundo pode ser uma <strong>cor sólida</strong>, um <strong>gradiente</strong> ou uma <strong>imagem</strong>. 
                  Se usar imagem, você pode selecionar da galeria ou usar a variável 
                  <code className="bg-purple-100 px-1 rounded mx-1">{'{{fundo_produto_N}}'}</code> para fundo dinâmico.
                </p>
              </section>

              {/* Formas */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">⬛ Formas e Decorações</h3>
                <p className="text-sm text-gray-600">
                  Retângulos, círculos, triângulos, linhas e estrelas são <strong>elementos fixos</strong>. 
                  Use-os para criar o layout visual do seu encarte. Eles não mudam quando o encarte é gerado.
                </p>
              </section>

              {/* Dicas */}
              <section className="bg-yellow-50 rounded p-3">
                <h3 className="font-semibold text-yellow-700 mb-2">💡 Dicas</h3>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Use os botões de variáveis abaixo do campo de texto para inserir rapidamente</li>
                  <li>Você pode combinar texto fixo com variáveis: "Apenas R$ {'{{preco_produto_1}}'}"</li>
                  <li>As réguas nas laterais ajudam no posicionamento preciso</li>
                  <li>Clique em um elemento para ver suas propriedades no painel direito</li>
                  <li>Use o painel de camadas para reordenar elementos</li>
                </ul>
              </section>

              {/* Exemplo */}
              <section>
                <h3 className="font-semibold text-blue-600 mb-2">📝 Exemplo Prático</h3>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="mb-2">Para um encarte com 2 produtos, você pode criar:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Texto: <code className="bg-gray-200 px-1">{'{{nome_produto_1}}'}</code> - R$ <code className="bg-gray-200 px-1">{'{{preco_produto_1}}'}</code></li>
                    <li>• Imagem: variável <code className="bg-gray-200 px-1">{'{{imagem_produto_1}}'}</code></li>
                    <li>• Texto: <code className="bg-gray-200 px-1">{'{{nome_produto_2}}'}</code> - R$ <code className="bg-gray-200 px-1">{'{{preco_produto_2}}'}</code></li>
                    <li>• Imagem: variável <code className="bg-gray-200 px-1">{'{{imagem_produto_2}}'}</code></li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <Button 
                onClick={() => setIsOpen(false)} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Entendi!
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
