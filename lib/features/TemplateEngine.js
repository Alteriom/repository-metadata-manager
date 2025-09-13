const RepositoryManager = require('../core/RepositoryManager');
const fs = require('fs').promises;
const path = require('path');

/**
 * Template Engine for generating project scaffolding
 * Specialized for Alteriom organization project types
 */
class TemplateEngine extends RepositoryManager {
    constructor(config = {}) {
        super(config);
        this.templates = new Map();
        this.initializeTemplates();
    }

    /**
     * Initialize built-in templates for Alteriom organization
     */
    initializeTemplates() {
        // IoT Firmware Template (ESP32/ESP8266, Arduino, PlatformIO)
        this.templates.set('iot-firmware', {
            name: 'IoT Firmware Project',
            description: 'ESP32/ESP8266 firmware with sensors, LoRa, and WiFi mesh',
            type: 'iot-firmware',
            language: 'C++',
            files: {
                'platformio.ini': this.getPlatformIOConfig(),
                'src/main.cpp': this.getMainCppTemplate(),
                'include/config.h': this.getConfigHeaderTemplate(),
                'include/sensors.h': this.getSensorsHeaderTemplate(),
                'include/connectivity.h': this.getConnectivityHeaderTemplate(),
                'lib/README': this.getLibReadmeTemplate(),
                'test/README': this.getTestReadmeTemplate(),
                'README.md': this.getIoTFirmwareReadme(),
                '.gitignore': this.getArduinoGitignore(),
                'LICENSE': this.getMITLicense(),
                'HARDWARE.md': this.getHardwareDocTemplate()
            },
            dependencies: ['platformio', 'esp32', 'wifi', 'lora', 'sensors'],
            topics: ['alteriom', 'iot', 'firmware', 'esp32', 'esp8266', 'platformio', 'lora', 'wifi-mesh', 'sensors']
        });

        // AI Agent Template
        this.templates.set('ai-agent', {
            name: 'AI Agent Project',
            description: 'AI-powered automation and repository management agent',
            type: 'ai-agent',
            language: 'JavaScript',
            files: {
                'package.json': this.getAIAgentPackageJson(),
                'index.js': this.getAIAgentIndexTemplate(),
                'lib/agent.js': this.getAgentCoreTemplate(),
                'lib/github-integration.js': this.getGitHubIntegrationTemplate(),
                'config/default.json': this.getAIAgentConfigTemplate(),
                'tests/agent.test.js': this.getAIAgentTestTemplate(),
                'README.md': this.getAIAgentReadme(),
                '.gitignore': this.getNodeGitignore(),
                '.eslintrc.js': this.getESLintConfig(),
                'LICENSE': this.getMITLicense(),
                'DEPLOYMENT.md': this.getDeploymentDocTemplate()
            },
            dependencies: ['@octokit/rest', 'openai', 'commander', 'dotenv'],
            topics: ['alteriom', 'ai-agent', 'automation', 'github-integration', 'compliance', 'repository-automation']
        });

        // IoT Web Platform Template
        this.templates.set('iot-platform', {
            name: 'IoT Web Platform',
            description: 'Multi-tenant IoT sensor network management platform',
            type: 'iot-platform',
            language: 'TypeScript',
            files: {
                'package.json': this.getIoTPlatformPackageJson(),
                'src/App.tsx': this.getReactAppTemplate(),
                'src/components/Dashboard.tsx': this.getDashboardComponentTemplate(),
                'src/services/mqtt.ts': this.getMQTTServiceTemplate(),
                'src/types/sensor.ts': this.getSensorTypesTemplate(),
                'backend/main.py': this.getFastAPIMainTemplate(),
                'backend/models/sensor.py': this.getSensorModelTemplate(),
                'backend/requirements.txt': this.getPythonRequirements(),
                'docker-compose.yml': this.getDockerComposeTemplate(),
                'README.md': this.getIoTPlatformReadme(),
                '.gitignore': this.getFullStackGitignore(),
                'tsconfig.json': this.getTypeScriptConfig(),
                'LICENSE': this.getMITLicense()
            },
            dependencies: ['react', 'typescript', 'fastapi', 'mqtt', 'influxdb', 'redis'],
            topics: ['alteriom', 'iot', 'platform', 'react', 'typescript', 'fastapi', 'mqtt', 'multi-tenant', 'real-time']
        });

        // CLI Tool Template
        this.templates.set('cli-tool', {
            name: 'CLI Tool Project',
            description: 'Command-line interface tool with comprehensive features',
            type: 'cli-tool',
            language: 'JavaScript',
            files: {
                'package.json': this.getCLIPackageJson(),
                'bin/cli.js': this.getCLIMainTemplate(),
                'lib/commands/index.js': this.getCLICommandsTemplate(),
                'lib/utils.js': this.getCLIUtilsTemplate(),
                'tests/cli.test.js': this.getCLITestTemplate(),
                'README.md': this.getCLIReadme(),
                '.gitignore': this.getNodeGitignore(),
                'LICENSE': this.getMITLicense()
            },
            dependencies: ['commander', 'inquirer', 'chalk', 'figlet'],
            topics: ['alteriom', 'cli', 'tool', 'command-line', 'utility']
        });
    }

    /**
     * Generate new project from template
     */
    async generateProject(templateName, projectName, options = {}) {
        console.log(`🎯 Generating ${templateName} project: ${projectName}`);

        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template "${templateName}" not found`);
        }

        const projectPath = options.outputPath || `./${projectName}`;
        
        try {
            // Create project directory
            await fs.mkdir(projectPath, { recursive: true });

            // Generate all template files
            for (const [filePath, content] of Object.entries(template.files)) {
                const fullPath = path.join(projectPath, filePath);
                const dir = path.dirname(fullPath);
                
                // Create directory if it doesn't exist
                await fs.mkdir(dir, { recursive: true });
                
                // Replace template variables
                const processedContent = this.processTemplate(content, {
                    projectName,
                    description: template.description,
                    organizationTag: this.config.organizationTag || 'alteriom',
                    ...options
                });
                
                await fs.writeFile(fullPath, processedContent);
            }

            console.log(`✅ Project generated successfully at: ${projectPath}`);
            console.log(`📁 Files created: ${Object.keys(template.files).length}`);
            
            // Display next steps
            this.displayNextSteps(template, projectName, projectPath);
            
            return {
                success: true,
                path: projectPath,
                template: template,
                files: Object.keys(template.files)
            };

        } catch (error) {
            console.error(`❌ Error generating project: ${error.message}`);
            throw error;
        }
    }

    /**
     * List available templates
     */
    listTemplates() {
        console.log('📋 Available Project Templates:\n');
        
        for (const [key, template] of this.templates) {
            console.log(`🎯 ${key}`);
            console.log(`   Name: ${template.name}`);
            console.log(`   Language: ${template.language}`);
            console.log(`   Description: ${template.description}`);
            console.log(`   Topics: ${template.topics.slice(0, 5).join(', ')}${template.topics.length > 5 ? '...' : ''}`);
            console.log();
        }
    }

    /**
     * Process template with variable substitution
     */
    processTemplate(template, variables) {
        let processed = template;
        for (const [key, value] of Object.entries(variables)) {
            const pattern = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(pattern, value);
        }
        return processed;
    }

    /**
     * Display next steps after project generation
     */
    displayNextSteps(template, projectName, projectPath) {
        console.log('\n🚀 Next Steps:');
        console.log(`   cd ${projectPath}`);
        
        if (template.language === 'JavaScript' || template.language === 'TypeScript') {
            console.log('   npm install');
            console.log('   npm run dev');
        } else if (template.type === 'iot-firmware') {
            console.log('   pio run');
            console.log('   pio upload');
        } else if (template.language === 'Python') {
            console.log('   pip install -r requirements.txt');
            console.log('   python main.py');
        }
        
        console.log('\n📚 Documentation:');
        console.log(`   - README.md for project overview`);
        if (template.files['HARDWARE.md']) {
            console.log(`   - HARDWARE.md for hardware specifications`);
        }
        if (template.files['DEPLOYMENT.md']) {
            console.log(`   - DEPLOYMENT.md for deployment instructions`);
        }
    }

    // Template content methods (showing key examples)

    getPlatformIOConfig() {
        return `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

monitor_speed = 115200
upload_speed = 921600

lib_deps = 
    bblanchon/ArduinoJson@^6.19.4
    knolleary/PubSubClient@^2.8
    sandeepmistry/LoRa@^0.8.0
    tzapu/WiFiManager@^0.16.0
    adafruit/Adafruit Unified Sensor@^1.1.4
    adafruit/DHT sensor library@^1.4.3

build_flags = 
    -DCORE_DEBUG_LEVEL=3
    -DCONFIG_ASYNC_TCP_STACK_SIZE=16384

[env:esp8266]
platform = espressif8266
board = nodemcuv2
framework = arduino

monitor_speed = 115200
upload_speed = 921600

lib_deps = 
    bblanchon/ArduinoJson@^6.19.4
    knolleary/PubSubClient@^2.8
    sandeepmistry/LoRa@^0.8.0
    tzapu/WiFiManager@^0.16.0
`;
    }

    getMainCppTemplate() {
        return `#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"
#include "connectivity.h"

// Global objects
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
SensorManager sensorManager;
ConnectivityManager connectivityManager;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("{{projectName}} - Alteriom IoT Firmware");
    Serial.println("=====================================");
    
    // Initialize sensors
    sensorManager.begin();
    
    // Initialize connectivity
    connectivityManager.begin();
    connectivityManager.connectWiFi();
    connectivityManager.connectMQTT();
    
    Serial.println("✅ Initialization complete");
}

void loop() {
    // Handle connectivity
    connectivityManager.loop();
    
    // Read and publish sensor data
    if (connectivityManager.isConnected()) {
        SensorData data = sensorManager.readAll();
        connectivityManager.publishSensorData(data);
    }
    
    delay(SENSOR_READ_INTERVAL);
}
`;
    }

    getIoTFirmwareReadme() {
        return `# {{projectName}}

{{description}}

## 🔧 Hardware Requirements

- ESP32 or ESP8266 development board
- Sensors (DHT22, BMP280, etc.)
- LoRa module (optional)
- Power supply

## 🚀 Quick Start

1. **Install PlatformIO**:
   \`\`\`bash
   pip install platformio
   \`\`\`

2. **Build and upload**:
   \`\`\`bash
   pio run
   pio upload
   \`\`\`

3. **Monitor serial output**:
   \`\`\`bash
   pio device monitor
   \`\`\`

## 📡 Features

- ✅ WiFi connectivity with automatic reconnection
- ✅ MQTT communication
- ✅ Multiple sensor support
- ✅ LoRa mesh networking (optional)
- ✅ OTA updates
- ✅ Configuration via WiFi portal
- ✅ Real-time sensor monitoring

## 🔧 Configuration

Edit \`include/config.h\` to customize:

- WiFi credentials
- MQTT broker settings
- Sensor pins and types
- LoRa parameters

## 📊 Sensor Data Format

\`\`\`json
{
  "device_id": "{{projectName}}_001",
  "timestamp": 1634567890,
  "sensors": {
    "temperature": 25.6,
    "humidity": 60.2,
    "pressure": 1013.25
  },
  "location": {
    "lat": 45.5152,
    "lng": -122.6784
  }
}
\`\`\`

## 🚀 Deployment

See [HARDWARE.md](HARDWARE.md) for detailed hardware setup instructions.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
`;
    }

    getAIAgentPackageJson() {
        return `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.js",
  "bin": {
    "{{projectName}}": "./bin/cli.js"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "keywords": [
    "{{organizationTag}}",
    "ai-agent",
    "automation",
    "github-integration",
    "compliance"
  ],
  "author": "{{organizationTag}} Organization",
  "license": "MIT",
  "dependencies": {
    "@octokit/rest": "^22.0.0",
    "openai": "^4.0.0",
    "commander": "^14.0.0",
    "chalk": "^4.1.2",
    "inquirer": "^12.0.0",
    "dotenv": "^17.0.0"
  },
  "devDependencies": {
    "jest": "^30.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}`;
    }

    getMITLicense() {
        return `MIT License

Copyright (c) ${new Date().getFullYear()} {{organizationTag}} Organization

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    }

    getNodeGitignore() {
        return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log
`;
    }

    getArduinoGitignore() {
        return `# PlatformIO
.pio/
.pioenvs/
.piolibdeps/
.vscode/

# Arduino IDE
*.ino.elf
*.ino.hex
*.ino.bin
*.ino.map

# Build artifacts
build/
*.o
*.a
*.so
*.dylib

# IDE files
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
*.log

# Credentials (never commit!)
credentials.h
secrets.h
`;
    }

    // Additional template methods - implementing all missing methods

    getConfigHeaderTemplate() {
        return `#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "{{projectName}}_network"
#define WIFI_PASSWORD "your_wifi_password"

// MQTT Configuration
#define MQTT_SERVER "mqtt.alteriom.com"
#define MQTT_PORT 1883
#define MQTT_USER "{{projectName}}"
#define MQTT_PASSWORD "your_mqtt_password"

// Sensor Configuration
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define BMP_SDA 21
#define BMP_SCL 22

// LoRa Configuration (optional)
#define LORA_SS 18
#define LORA_RST 14
#define LORA_DIO0 26
#define LORA_FREQUENCY 915E6

// Device Configuration
#define DEVICE_ID "{{projectName}}_001"
#define SENSOR_READ_INTERVAL 30000  // 30 seconds
#define MQTT_PUBLISH_INTERVAL 60000 // 1 minute

// OTA Configuration
#define OTA_PASSWORD "{{projectName}}_ota"
#define OTA_PORT 3232

#endif // CONFIG_H
`;
    }

    getSensorsHeaderTemplate() {
        return `#ifndef SENSORS_H
#define SENSORS_H

#include <DHT.h>
#include <Adafruit_BMP280.h>

struct SensorData {
    float temperature;
    float humidity;
    float pressure;
    unsigned long timestamp;
};

class SensorManager {
private:
    DHT dht;
    Adafruit_BMP280 bmp;
    bool dhtReady;
    bool bmpReady;

public:
    SensorManager();
    bool begin();
    SensorData readAll();
    bool isReady();
    void calibrate();
};

#endif // SENSORS_H
`;
    }

    getConnectivityHeaderTemplate() {
        return `#ifndef CONNECTIVITY_H
#define CONNECTIVITY_H

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "sensors.h"

class ConnectivityManager {
private:
    WiFiClient wifiClient;
    PubSubClient mqttClient;
    unsigned long lastReconnectAttempt;
    bool wifiConnected;
    bool mqttConnected;

public:
    ConnectivityManager();
    bool begin();
    bool connectWiFi();
    bool connectMQTT();
    void loop();
    bool isConnected();
    bool publishSensorData(const SensorData& data);
    void handleMQTTMessage(char* topic, byte* payload, unsigned int length);
};

#endif // CONNECTIVITY_H
`;
    }

    getLibReadmeTemplate() {
        return `This directory is intended for project specific (private) libraries.
PlatformIO will compile them to static libraries and link into executable file.

The source code of each library should be placed in a an own separate directory
("lib/your_library_name/[here are source files]").

More information about PlatformIO Library Dependency Finder
- https://docs.platformio.org/page/librarymanager/ldf.html
`;
    }

    getTestReadmeTemplate() {
        return `This directory is intended for PlatformIO Test Runner and project tests.

Unit Testing is a software testing method by which individual units of
source code, sets of one or more MCU program modules together with associated
control data, usage procedures, and operating procedures, are tested to
determine whether they are fit for use.

More information about PlatformIO Unit Testing:
- https://docs.platformio.org/page/plus/unit-testing.html
`;
    }

    getHardwareDocTemplate() {
        return `# Hardware Documentation

## {{projectName}} Hardware Specifications

### Supported Microcontrollers
- **ESP32 DevKit V1** (Recommended)
- **ESP8266 NodeMCU V3** (Alternative)

### Required Components
| Component | Part Number | Quantity | Purpose |
|-----------|-------------|----------|---------|
| Temperature/Humidity Sensor | DHT22 | 1 | Environmental monitoring |
| Pressure Sensor | BMP280 | 1 | Atmospheric pressure |
| LoRa Module | SX1276 | 1 | Long-range communication |

### Pin Connections
#### ESP32 Connections
| Sensor | ESP32 Pin | Purpose |
|--------|-----------|---------|
| DHT22 Data | GPIO 4 | Temperature/Humidity |
| BMP280 SDA | GPIO 21 | Pressure sensor data |
| BMP280 SCL | GPIO 22 | Pressure sensor clock |

### Assembly Instructions
1. Connect DHT22 sensor: VCC to 3.3V, GND to GND, DATA to GPIO 4
2. Connect BMP280 sensor: VCC to 3.3V, GND to GND, SDA to GPIO 21, SCL to GPIO 22
3. Connect LoRa module (optional): Follow SPI connections as specified

### Safety Considerations
- Use appropriate voltage levels (3.3V for most sensors)
- Ensure proper grounding for all components
- Follow ESD precautions when handling components
`;
    }

    // Placeholder implementations for other template methods
    getIoTPlatformPackageJson() { return '{"name": "{{projectName}}", "version": "1.0.0"}'; }
    getReactAppTemplate() { return '// React App Template\nimport React from "react";\n\nfunction App() {\n  return <div>{{projectName}} IoT Platform</div>;\n}\n\nexport default App;'; }
    getDashboardComponentTemplate() { return '// Dashboard Component'; }
    getMQTTServiceTemplate() { return '// MQTT Service'; }
    getSensorTypesTemplate() { return '// Sensor Types'; }
    getFastAPIMainTemplate() { return '# FastAPI Main Template\nfrom fastapi import FastAPI\n\napp = FastAPI(title="{{projectName}}")'; }
    getSensorModelTemplate() { return '# Sensor Model'; }
    getPythonRequirements() { return 'fastapi>=0.68.0\nuvicorn>=0.15.0\npaho-mqtt>=1.5.1\ninfluxdb-client>=1.24.0'; }
    getDockerComposeTemplate() { return 'version: "3.8"\nservices:\n  {{projectName}}:\n    build: .\n    ports:\n      - "8000:8000"'; }
    getIoTPlatformReadme() { return '# {{projectName}}\n\n{{description}}\n\n## Features\n- React TypeScript frontend\n- FastAPI Python backend\n- MQTT integration\n- Real-time monitoring'; }
    getFullStackGitignore() { return this.getNodeGitignore() + '\n# Python\n__pycache__/\n*.py[cod]\n*$py.class\n.env\nvenv/'; }
    getTypeScriptConfig() { return '{\n  "compilerOptions": {\n    "target": "es5",\n    "lib": ["dom", "es6"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "esModuleInterop": true,\n    "allowSyntheticDefaultImports": true,\n    "strict": true,\n    "forceConsistentCasingInFileNames": true,\n    "moduleResolution": "node",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true,\n    "jsx": "react-jsx"\n  },\n  "include": ["src"]\n}'; }
    getCLIPackageJson() { return '{"name": "{{projectName}}", "version": "1.0.0", "bin": {"{{projectName}}": "./bin/cli.js"}}'; }
    getCLIMainTemplate() { return '#!/usr/bin/env node\nconst { Command } = require("commander");\n\nconst program = new Command();\nprogram.version("1.0.0").description("{{projectName}} CLI");\nprogram.parse();'; }
    getCLICommandsTemplate() { return '// CLI Commands Template'; }
    getCLIUtilsTemplate() { return '// CLI Utils Template'; }
    getCLITestTemplate() { return '// CLI Tests Template'; }
    getCLIReadme() { return '# {{projectName}}\n\n{{description}}\n\n## Installation\n\n```bash\nnpm install -g {{projectName}}\n```\n\n## Usage\n\n```bash\n{{projectName}} --help\n```'; }
    
    getAIAgentIndexTemplate() { return 'const AgentCore = require("./lib/agent");\n\nclass {{projectName}}Agent {\n  constructor() {\n    this.agent = new AgentCore();\n  }\n\n  async start() {\n    console.log("🤖 Starting {{projectName}} AI Agent...");\n    await this.agent.initialize();\n  }\n}\n\nmodule.exports = {{projectName}}Agent;'; }
    getAgentCoreTemplate() { return 'class AgentCore {\n  constructor() {\n    this.initialized = false;\n  }\n\n  async initialize() {\n    console.log("🔄 Initializing AI Agent Core...");\n    this.initialized = true;\n  }\n}\n\nmodule.exports = AgentCore;'; }
    getGitHubIntegrationTemplate() { return 'const { Octokit } = require("@octokit/rest");\n\nclass GitHubIntegration {\n  constructor() {\n    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });\n  }\n}\n\nmodule.exports = GitHubIntegration;'; }
    getAIAgentConfigTemplate() { return '{\n  "github": {\n    "organization": "{{organizationTag}}",\n    "token": null\n  },\n  "monitoring": {\n    "interval": 300000\n  }\n}'; }
    getAIAgentTestTemplate() { return 'const AgentCore = require("../lib/agent");\n\ndescribe("AgentCore", () => {\n  test("should initialize", async () => {\n    const agent = new AgentCore();\n    await agent.initialize();\n    expect(agent.initialized).toBe(true);\n  });\n});'; }
    getAIAgentReadme() { return '# {{projectName}}\n\n{{description}}\n\n## Features\n- Automated repository compliance monitoring\n- AI-powered code analysis\n- GitHub integration\n\n## Quick Start\n\n1. Install dependencies: `npm install`\n2. Configure environment: `cp .env.example .env`\n3. Start the agent: `npm start`'; }
    getDeploymentDocTemplate() { return '# Deployment Guide\n\n## {{projectName}} Deployment\n\n### Environment Setup\n\n1. Development: `npm install && npm run dev`\n2. Production: `npm install --production && npm start`\n\n### Docker Deployment\n\n```bash\ndocker build -t {{projectName}} .\ndocker run -d {{projectName}}\n```'; }
    getESLintConfig() { return 'module.exports = {\n  env: {\n    node: true,\n    es2021: true\n  },\n  extends: ["eslint:recommended"],\n  rules: {\n    "indent": ["error", 4],\n    "quotes": ["error", "single"],\n    "semi": ["error", "always"]\n  }\n};'; }
}

module.exports = TemplateEngine;