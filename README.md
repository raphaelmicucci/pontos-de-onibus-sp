# Pontos de Ônibus SP

Visualize os pontos de ônibus da cidade de São Paulo em um mapa interativo e acesse-os diretamente no [Olho Vivo](https://olhovivo.sptrans.com.br/).

## Como usar

1. Abra `index.html` num navegador moderno (ou sirva com qualquer servidor HTTP estático).
2. Carregue o arquivo **GTFS da SPTrans** (arquivo `.zip`), disponível em [sptrans.com.br/desenvolvedor](https://www.sptrans.com.br/desenvolvedor/).
3. Clique em **"📍 Minha localização"** para centralizar o mapa na sua posição atual.
4. Os pontos de ônibus próximos (até 1,5 km) são exibidos automaticamente no mapa.
5. Clique em qualquer ponto para ver o nome, ID e um link direto para o **Olho Vivo**.

## Funcionalidades

- 🗺️ Mapa em tela cheia com tiles do OpenStreetMap
- 📍 Localização do usuário via GPS/rede
- 🚏 Pontos de ônibus ao redor carregados do GTFS (stops.txt)
- 🔗 Link direto para cada parada no Olho Vivo: `https://olhovivo.sptrans.com.br/#sp?cat=Parada&PID={id}`

## Tecnologias

- [Leaflet.js](https://leafletjs.com/) — mapa interativo
- [JSZip](https://stuk.github.io/jszip/) — leitura do arquivo GTFS `.zip`
- [PapaParse](https://www.papaparse.com/) — leitura do `stops.txt` (CSV)

