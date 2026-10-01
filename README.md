# Meu site — vitrine 3D com rolagem

Site da software house. Uma cena 3D (notebook e celular) fica fixa na tela, e a câmera se move conforme a rolagem da página: plano aberto, aproximação na tela do notebook (loja virtual e depois site de destino), recuo e aproximação no celular (app). Os textos de cada capítulo são HTML comum, sobrepostos ao canvas.

## Rodando

```bash
npm install
npm run dev       # servidor local com recarga automática
npm run build     # gera a versão de produção em dist/
npm run preview   # serve o dist/ para conferir o build
```

Requer Node 18 ou mais recente.

## Estrutura

```
index.html          marcação dos capítulos, navegação e trilho lateral
src/main.js         cena three.js, modelos, luzes, câmera guiada pela rolagem e laço de animação
src/screens.js      conteúdo desenhado nas telas (editor de código, loja, site de destino, bloqueio e app)
src/utils.js        funções de interpolação e easing
src/style.css       tokens de cor e tipografia, capítulos, trilho e fallback sem WebGL
public/models/      notebook.glb, celular.glb e suporte.glb, gerados pelo script do Blender
public/draco/       decodificador para modelos exportados com compressão Draco
blender/            scripts do Blender (modelos e estúdio), estudio.blend e imagens das telas
public/videos/      onde entram as gravações dos projetos reais
prototipo/          o protótipo original em arquivo único, só para referência
```

## Como a coreografia funciona

O progresso da rolagem vira um número de 0 a 1, suavizado a cada quadro. A função `shots()` em `src/main.js` define as tomadas da câmera nesses pontos:

| Progresso | Tomada | Tela |
|---|---|---|
| 0,00 a 0,12 | plano aberto, tampa do notebook abrindo | editor de código |
| 0,24 a 0,50 | close no notebook | loja (0,24–0,36), site de destino (0,39–0,50) |
| 0,60 | recuo | — |
| 0,72 a 0,92 | close no celular | tela de bloqueio, depois app |
| 1,00 | plano final | chamada para contato |

Os textos de cada capítulo usam `data-in` e `data-out` no `index.html` com os mesmos valores. Para mudar o ritmo, ajuste os números em `shots()`, os intervalos das telas no laço `frame()` e os atributos dos capítulos juntos. A altura total da rolagem está em `.track { height: 900vh }`, no CSS.

## Modelos 3D (Blender)

`blender/gerar_aparelhos.py` modela o notebook e o celular do zero (chassi com cantos arredondados e chanfros, teclado com teclas individuais, trackpad, dobradiça, portas USB-C, ilha da câmera, botões laterais e módulo de câmeras) e exporta os dois `.glb` para `public/models/`.

Para rodar: abra o Blender (4.2 ou mais recente), vá na aba Scripting, abra o arquivo e clique em Run Script. Pelo terminal: `blender -b -P blender/gerar_aparelhos.py`. Os aparelhos também ficam na cena, então dá para ajustar à mão e exportar de novo pelo menu File > Export > glTF 2.0, com o formato .glb.

Se editar à mão, mantenha as convenções que o site usa: a malha da tela de cada aparelho se chama `screen` (o site procura por nomes que começam assim) e tem UV ocupando 0..1; a tampa do notebook é filha do Empty `LidPivot`, que gira em X; a frente dos aparelhos fica voltada para -Y; e a origem fica no centro da base, em Z = 0. As medidas das telas (2,74 × 1,7125 no notebook e 0,74 × 1,60 no celular) precisam continuar as mesmas, porque o enquadramento da câmera usa esses valores.

O site carrega os modelos com `GLTFLoader` e, enquanto eles não chegam, mostra os aparelhos simples feitos em código. Se o carregamento falhar, a versão simples continua na tela.

O celular fica num suporte dobrável (`suporte.glb`). O Empty `PhoneSlot` do suporte marca onde o celular encaixa. No site, entre 0,60 e 0,71 da rolagem o celular sai do suporte num caminho em curva (sobe para sair dos ganchos e vem para a câmera), fica "na mão" com um balanço leve enquanto o app é mostrado, e volta para o suporte entre 0,93 e 0,995. A pose na mão é definida em `pick.held`, e o movimento em `animarCelular()`, ambos em `src/main.js`.

`blender/montar_estudio.py` monta o estúdio de apresentação em volta dos aparelhos: fundo todo preto, chão que só aparece em reflexos fracos, três luzes de área com facho fechado, câmera e o conteúdo do site nas telas (imagens em `blender/telas/`). Rode depois do `gerar_aparelhos.py`. O resultado fica salvo em `blender/estudio.blend`.

## Próximos passos

1. Trocar o conteúdo desenhado das telas por gravações reais (`THREE.VideoTexture` a partir de `public/videos/`). Clipes de 10 a 20 segundos: 1280×800 para o notebook e 540×1168 (vertical) para o celular.
2. Refinar o realismo: mapa HDRI de estúdio (Poly Haven), pós-processamento (bloom, profundidade de campo, vinheta) e oclusão ambiente assada no Blender.
3. Aplicar a identidade da empresa: nome, cores (tokens no topo do `style.css`), tipografia e textos. "Estúdio Kernel" e o e-mail de contato são provisórios.
4. Otimizar para celulares de entrada: carregar os vídeos sob demanda e reduzir a resolução de render em telas pequenas.
