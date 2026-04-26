# 🌐 AirGuard Dashboard TCC v3

Dashboard analítico desenvolvido para o projeto **AirGuard**, com foco em visualização avançada de dados IoT, análise temporal, eventos e avaliação de comportamento do sistema.

Este dashboard consome dados de um backend integrado ao **MQTT + MongoDB Atlas**, permitindo análise completa do ambiente monitorado.

---

## 🎯 Objetivo

Este dashboard foi desenvolvido como parte do **Trabalho de Conclusão de Curso (TCC)** com o propósito de:

- Visualizar dados ambientais em tempo real
- Analisar comportamento histórico de sensores
- Identificar eventos e padrões de risco
- Demonstrar a integração entre Edge Computing e Cloud Computing
- Avaliar a viabilidade da solução em ambientes reais

---

## 🧱 Arquitetura do Sistema
ESP32 + Sensores
↓ MQTT
HiveMQ Cloud
↓
Backend (Node.js)
↓
MongoDB Atlas
↓
Dashboard TCC (este projeto)

---

## 🚀 Funcionalidades

### 🔎 Filtros por Período
- Seleção de sensor
- Data e hora inicial
- Data e hora final

---

### 📊 Visualização Temporal
- Gráfico de CO (ppm)
- Gráfico de gás combustível (ppm)
- Linhas de threshold (alerta e perigo)

---

### 📈 KPIs em Tempo Real
- CO atual
- Gás atual
- Temperatura
- Umidade
- Presença
- Status do sistema

---

### 📊 Estatísticas do Período
- Média, mínimo e máximo
- Total de leituras
- Intervalo de coleta
- Último status registrado

---

### 🚨 Eventos
- Transições de estado:
  - LIMPO → ALERTA
  - ALERTA → PERIGO
- Histórico de mudanças de condição

---

### 📥 Exportação de Dados
- Exportação do histórico em CSV
- Ideal para análise externa

---

### 🧠 Análise Edge vs Cloud

O dashboard apresenta uma interpretação automática baseada nos dados:

- **Edge (ESP32)**  
  Processamento local com resposta imediata (buzzer, status)

- **Cloud (Backend + MongoDB)**  
  Armazenamento, análise histórica e visualização remota

---

## 📂 Estrutura do Projeto
dashboard-tcc/
├── index.html
├── styles.css
├── script.js
└── config.js


---

## ⚙️ Configuração

### 1. Backend

Certifique-se de que o backend está rodando e acessível.

---

### 2. Arquivo `config.js`

```javascript
const CONFIG = {
  API_BASE_URL: "https://SEU-BACKEND.onrender.com",
  DEFAULT_SENSOR_ID: "SN-CO-001"
};
```

| Endpoint                     | Descrição                  |
| ---------------------------- | -------------------------- |
| `/api/sensors`               | Lista sensores disponíveis |
| `/api/latest/:sensorId`      | Última leitura             |
| `/api/history/:sensorId`     | Histórico por período      |
| `/api/stats-range/:sensorId` | Estatísticas por intervalo |
| `/api/events/:sensorId`      | Eventos do sensor          |

📡 Exemplo de Requisição
GET /api/history/SN-CO-001?start=2026-04-19T00:00:00&end=2026-04-21T23:59:00

▶️ Como Executar
1. Configure o config.js
2. Abra o arquivo: index.html
3. O dashboard irá:
4. carregar sensores automaticamente
5. aplicar filtros
6. renderizar gráficos e análises

🧠 Tecnologias Utilizadas
HTML5
CSS3
JavaScript (Vanilla)
Chart.js
Node.js (backend)
MongoDB Atlas
MQTT (HiveMQ Cloud)
ESP32

⚠️ Observações
O dashboard depende do backend com CORS habilitado
Os dados são atualizados conforme disponibilidade do sensor
Sensores MQ possuem sensibilidade cruzada entre gases
