# Pontos de Ônibus SP

Visualize os pontos de ônibus da cidade de São Paulo em um mapa interativo e acesse-os diretamente no [Olho Vivo](https://olhovivo.sptrans.com.br/).

## Como usar

1. Abra `index.html` num navegador moderno (ou sirva com qualquer servidor HTTP estático).
2. Os pontos de ônibus carregam automaticamente a partir de `data/stops.txt`.
3. Clique em **"📍 Minha localização"** para centralizar o mapa na sua posição atual.
4. Os pontos próximos (até 1,5 km) são exibidos automaticamente no mapa.
5. Clique em qualquer ponto para ver o nome, ID e um link direto para o **Olho Vivo**.

## Funcionalidades

- 🗺️ Mapa em tela cheia com tiles do OpenStreetMap
- 📍 Localização do usuário via GPS/rede
- 🚏 22.106 pontos de ônibus carregados diretamente de `data/stops.txt`
- 🔗 Link direto para cada parada no Olho Vivo: `https://olhovivo.sptrans.com.br/#sp?cat=Parada&PID={id}`

## Tecnologias

- [Leaflet.js](https://leafletjs.com/) — mapa interativo
- [PapaParse](https://www.papaparse.com/) — leitura do `stops.txt` (CSV)

