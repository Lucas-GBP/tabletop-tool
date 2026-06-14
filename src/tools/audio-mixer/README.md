## Audio Mixer

Este modulo e a biblioteca/editor de audio do projeto. Ele nao representa uma cena.

O escopo atual e:

`Arquivo de audio -> Objeto de audio -> Lista de objetos de audio`

O escopo futuro de cena fica fora deste modulo:

`Lista de objetos de audio -> Composicao de audios -> Cena`

### Arquivo de Audio

Os arquivos de audio podem ser encontrados, atualmente, na pasta `public/audio`.
Eles sao a materia-prima da biblioteca, mas nao devem ser usados diretamente por
uma cena. Primeiro, um arquivo vira um objeto de audio.

### Objeto de Audio

Um objeto de audio adiciona configuracao reutilizavel a um arquivo:

- Nome
- Descricao
- Tags
- Volume base
- Inicio e termino do trecho tocavel
- Trecho interno de loop
- Fade-in e fade-out

O mixer permite criar, editar, remover e ouvir esses objetos. A waveform ajuda a
encontrar visualmente inicio, fim e area de loop.

### Lista de Objetos de Audio

Uma lista agrupa objetos de audio. Quando uma lista for usada por uma futura
composicao, ela deve escolher aleatoriamente um objeto da lista a cada reproducao.

Uma lista com apenas um objeto se comporta como aquele objeto.

### Fora do Mixer

Composicoes de audio e cenas devem ser tratadas por outro modulo. Esse modulo
futuro sera responsavel por:

- Objetos ou listas tocando em loop.
- Listas tocando aleatoriamente com frequencia configurada na composicao.
- Triggers/botoes/hotkeys que tocam listas sob comando do mestre.

### Persistencia

A estrutura da biblioteca e armazenada no SQLite global do Tabletop Tool, no
diretorio de dados do app:

`tabletop-tool.sqlite3`

As tabelas do mixer guardam apenas metadados, configuracoes e relacoes. Os
arquivos de audio continuam fora do banco, em `public/audio` durante o
desenvolvimento.
