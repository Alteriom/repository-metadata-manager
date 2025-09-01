/**
 * IoT Repository Manager
 * Specialized management for IoT/embedded systems repositories
 */
const RepositoryManager = require('../core/RepositoryManager');
const fs = require('fs').promises;
const path = require('path');

class IoTManager extends RepositoryManager {
    constructor(config = {}) {
        super(config);
        this.iotTypes = [
            'iot-firmware',
            'iot-server',
            'iot-documentation',
            'iot-infrastructure',
        ];
    }

    /**
     * Detect if repository is IoT-related
     */
    async detectIoTRepository() {
        try {
            const packageData = await this.getPackageMetadata();
            if (packageData) {
                const repoType = this.detectRepositoryType(packageData);
                return this.iotTypes.includes(repoType);
            }

            // Check for IoT-specific files if no package.json
            const iotFiles = await this.checkIoTFiles();
            return iotFiles.length > 0;
        } catch (error) {
            console.error('Error detecting IoT repository:', error.message);
            return false;
        }
    }

    /**
     * Check for IoT-specific files
     */
    async checkIoTFiles() {
        const iotFiles = [];
        const filesToCheck = [
            'platformio.ini',
            'arduino.ino',
            'src/main.cpp',
            'src/main.c',
            'lib/',
            'include/',
            'CMakeLists.txt',
            'Makefile',
            'esp32/',
            'esp8266/',
            'firmware/',
            'hardware/',
            'pcb/',
            'schematics/',
            'mqtt.conf',
            'sensor-config.json',
            'lora-config.h',
            'wifi-config.h',
        ];

        for (const file of filesToCheck) {
            try {
                const filePath = path.join(process.cwd(), file);
                await fs.access(filePath);
                iotFiles.push(file);
            } catch {
                // File doesn't exist, continue
            }
        }

        return iotFiles;
    }

    /**
     * Audit IoT repository for compliance
     */
    async auditIoTCompliance() {
        console.log('🔍 Starting IoT repository compliance audit...\n');

        const results = {
            isIoT: false,
            repositoryType: 'general',
            score: 0,
            maxScore: 100,
            findings: [],
            recommendations: [],
            iotFiles: [],
            securityIssues: [],
            documentationIssues: [],
        };

        // Detect if this is an IoT repository
        results.isIoT = await this.detectIoTRepository();

        if (!results.isIoT) {
            console.log('ℹ️  This does not appear to be an IoT repository');
            return results;
        }

        console.log('✅ IoT repository detected\n');

        // Get repository type
        const packageData = await this.getPackageMetadata();
        if (packageData) {
            results.repositoryType = this.detectRepositoryType(packageData);
        }

        // Check IoT-specific files
        results.iotFiles = await this.checkIoTFiles();

        // Run type-specific audits
        await this.auditByType(results);

        // Calculate score
        results.score = this.calculateIoTScore(results);

        this.displayIoTResults(results);
        return results;
    }

    /**
     * Run audits based on IoT repository type
     */
    async auditByType(results) {
        switch (results.repositoryType) {
            case 'iot-firmware':
                await this.auditFirmware(results);
                break;
            case 'iot-server':
                await this.auditIoTServer(results);
                break;
            case 'iot-documentation':
                await this.auditIoTDocumentation(results);
                break;
            case 'iot-infrastructure':
                await this.auditIoTInfrastructure(results);
                break;
            default:
                await this.auditGeneralIoT(results);
        }
    }

    /**
     * Audit firmware-specific requirements
     */
    async auditFirmware(results) {
        const checks = [
            {
                file: 'platformio.ini',
                weight: 15,
                name: 'PlatformIO configuration',
            },
            { file: 'src/main.cpp', weight: 10, name: 'Main firmware file' },
            { file: 'include/', weight: 8, name: 'Header files directory' },
            { file: 'lib/', weight: 5, name: 'Libraries directory' },
            { file: 'README.md', weight: 10, name: 'Documentation' },
            { file: 'LICENSE', weight: 5, name: 'License file' },
            { file: '.gitignore', weight: 3, name: 'Git ignore file' },
        ];

        for (const check of checks) {
            if (
                results.iotFiles.includes(check.file) ||
                (await this.fileExists(check.file))
            ) {
                results.score += check.weight;
                results.findings.push(`✅ ${check.name} found`);
            } else {
                results.recommendations.push(
                    `Add ${check.name} (${check.file})`
                );
            }
        }

        // Check for security best practices
        await this.auditFirmwareSecurity(results);
    }

    /**
     * Audit IoT server requirements
     */
    async auditIoTServer(results) {
        const checks = [
            {
                file: 'requirements.txt',
                weight: 10,
                name: 'Python dependencies',
            },
            { file: 'package.json', weight: 10, name: 'Node.js dependencies' },
            {
                file: 'docker-compose.yml',
                weight: 15,
                name: 'Docker deployment',
            },
            { file: 'Dockerfile', weight: 10, name: 'Container configuration' },
            { file: 'config/', weight: 8, name: 'Configuration directory' },
            { file: 'tests/', weight: 12, name: 'Test suite' },
            { file: '.env.example', weight: 8, name: 'Environment template' },
        ];

        for (const check of checks) {
            if (await this.fileExists(check.file)) {
                results.score += check.weight;
                results.findings.push(`✅ ${check.name} found`);
            } else {
                results.recommendations.push(
                    `Add ${check.name} (${check.file})`
                );
            }
        }

        // Check for MQTT/API documentation
        await this.auditServerDocumentation(results);
    }

    /**
     * Audit IoT documentation requirements
     */
    async auditIoTDocumentation(results) {
        const checks = [
            { file: 'README.md', weight: 20, name: 'Main documentation' },
            { file: 'docs/', weight: 15, name: 'Documentation directory' },
            { file: 'API.md', weight: 10, name: 'API documentation' },
            { file: 'HARDWARE.md', weight: 10, name: 'Hardware documentation' },
            { file: 'INSTALLATION.md', weight: 8, name: 'Installation guide' },
            {
                file: 'TROUBLESHOOTING.md',
                weight: 7,
                name: 'Troubleshooting guide',
            },
            { file: 'examples/', weight: 10, name: 'Examples directory' },
        ];

        for (const check of checks) {
            if (await this.fileExists(check.file)) {
                results.score += check.weight;
                results.findings.push(`✅ ${check.name} found`);
            } else {
                results.recommendations.push(
                    `Add ${check.name} (${check.file})`
                );
            }
        }
    }

    /**
     * Audit IoT infrastructure requirements
     */
    async auditIoTInfrastructure(results) {
        const checks = [
            {
                file: 'docker-compose.yml',
                weight: 20,
                name: 'Docker Compose configuration',
            },
            { file: 'Dockerfile', weight: 15, name: 'Container definitions' },
            { file: 'k8s/', weight: 10, name: 'Kubernetes manifests' },
            { file: 'terraform/', weight: 10, name: 'Infrastructure as Code' },
            { file: 'scripts/', weight: 8, name: 'Deployment scripts' },
            {
                file: 'monitoring/',
                weight: 12,
                name: 'Monitoring configuration',
            },
            { file: 'security/', weight: 10, name: 'Security policies' },
        ];

        for (const check of checks) {
            if (await this.fileExists(check.file)) {
                results.score += check.weight;
                results.findings.push(`✅ ${check.name} found`);
            } else {
                results.recommendations.push(
                    `Add ${check.name} (${check.file})`
                );
            }
        }
    }

    /**
     * Audit general IoT requirements
     */
    async auditGeneralIoT(results) {
        const checks = [
            { file: 'README.md', weight: 25, name: 'Documentation' },
            { file: 'LICENSE', weight: 10, name: 'License file' },
            { file: '.gitignore', weight: 5, name: 'Git ignore file' },
            { file: 'CHANGELOG.md', weight: 8, name: 'Change log' },
            {
                file: 'CONTRIBUTING.md',
                weight: 7,
                name: 'Contribution guidelines',
            },
        ];

        for (const check of checks) {
            if (await this.fileExists(check.file)) {
                results.score += check.weight;
                results.findings.push(`✅ ${check.name} found`);
            } else {
                results.recommendations.push(
                    `Add ${check.name} (${check.file})`
                );
            }
        }
    }

    /**
     * Audit firmware security
     */
    async auditFirmwareSecurity(results) {
        // Check for common security files/patterns
        if (
            (await this.fileExists('src/security.h')) ||
            (await this.fileExists('include/security.h'))
        ) {
            results.findings.push('✅ Security header file found');
        } else {
            results.securityIssues.push('Consider adding security header file');
        }

        if (
            (await this.fileExists('src/crypto.cpp')) ||
            (await this.fileExists('lib/crypto/'))
        ) {
            results.findings.push('✅ Cryptography implementation found');
        } else {
            results.securityIssues.push(
                'Consider adding cryptographic functions'
            );
        }
    }

    /**
     * Audit server documentation
     */
    async auditServerDocumentation(results) {
        if (
            (await this.fileExists('API.md')) ||
            (await this.fileExists('docs/api.md'))
        ) {
            results.findings.push('✅ API documentation found');
        } else {
            results.documentationIssues.push('Add API documentation');
        }
    }

    /**
     * Calculate IoT compliance score
     */
    calculateIoTScore(results) {
        // Base score from file checks (already calculated)
        let score = results.score;

        // Bonus points for security considerations
        if (results.securityIssues.length === 0) {
            score += 10;
        }

        // Bonus points for comprehensive documentation
        if (results.documentationIssues.length === 0) {
            score += 10;
        }

        // Ensure score doesn't exceed 100
        return Math.min(score, 100);
    }

    /**
     * Display IoT audit results
     */
    displayIoTResults(results) {
        console.log(`📊 IoT Compliance Score: ${results.score}/100`);
        console.log(`🎯 Repository Type: ${results.repositoryType}\n`);

        if (results.findings.length > 0) {
            console.log('✅ Compliance Findings:');
            results.findings.forEach((finding) => console.log(`  ${finding}`));
            console.log();
        }

        if (results.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            results.recommendations.forEach((rec) => console.log(`  • ${rec}`));
            console.log();
        }

        if (results.securityIssues.length > 0) {
            console.log('🔒 Security Recommendations:');
            results.securityIssues.forEach((issue) =>
                console.log(`  • ${issue}`)
            );
            console.log();
        }

        if (results.documentationIssues.length > 0) {
            console.log('📚 Documentation Recommendations:');
            results.documentationIssues.forEach((issue) =>
                console.log(`  • ${issue}`)
            );
            console.log();
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(path.join(process.cwd(), filePath));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get package metadata with IoT context
     */
    async getPackageMetadata() {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            return JSON.parse(packageContent);
        } catch {
            return null;
        }
    }

    /**
     * Detect repository type for IoT
     */
    detectRepositoryType(packageMetadata) {
        if (!packageMetadata) return 'general';

        const { keywords = [], name = '', description = '' } = packageMetadata;
        const content = [...keywords, name, description]
            .join(' ')
            .toLowerCase();

        // IoT and Embedded Systems Detection
        if (
            content.includes('firmware') ||
            content.includes('embedded') ||
            content.includes('esp32') ||
            content.includes('esp8266') ||
            content.includes('arduino') ||
            content.includes('platformio')
        ) {
            return 'iot-firmware';
        }

        if (
            content.includes('server') &&
            (content.includes('iot') ||
                content.includes('mqtt') ||
                content.includes('sensor'))
        ) {
            return 'iot-server';
        }

        if (content.includes('documentation') && content.includes('iot')) {
            return 'iot-documentation';
        }

        if (content.includes('docker') && content.includes('iot')) {
            return 'iot-infrastructure';
        }

        return 'general';
    }

    /**
     * Generate IoT-specific templates
     */
    async generateIoTTemplate(type) {
        console.log(`🏗️  Generating ${type} template...\n`);

        const templates = {
            'iot-firmware': this.generateFirmwareTemplate(),
            'iot-server': this.generateServerTemplate(),
            'iot-documentation': this.generateDocumentationTemplate(),
            'iot-infrastructure': this.generateInfrastructureTemplate(),
        };

        const template = templates[type];
        if (template) {
            console.log(template);
        } else {
            console.log('❌ Unknown IoT template type');
        }
    }

    /**
     * Generate firmware template structure
     */
    generateFirmwareTemplate() {
        return `
📁 IoT Firmware Project Structure:

├── platformio.ini          # PlatformIO configuration
├── src/
│   ├── main.cpp            # Main application code
│   ├── config.h            # Configuration constants
│   ├── sensors.cpp         # Sensor management
│   ├── wifi_manager.cpp    # WiFi connectivity
│   ├── mqtt_client.cpp     # MQTT communication
│   └── security.cpp        # Security functions
├── include/
│   ├── config.h            # Global configuration
│   ├── sensors.h           # Sensor definitions
│   └── security.h          # Security headers
├── lib/                    # Custom libraries
├── test/                   # Unit tests
├── docs/
│   ├── HARDWARE.md         # Hardware documentation
│   ├── API.md              # Communication protocol
│   └── SETUP.md            # Setup instructions
├── examples/               # Usage examples
├── schematics/             # Circuit diagrams
├── README.md               # Project documentation
├── LICENSE                 # License file
└── .gitignore              # Git ignore rules

🔧 Recommended platformio.ini:
[env:esp32]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps = 
    knolleary/PubSubClient
    bblanchon/ArduinoJson
    me-no-dev/ESPAsyncWebServer
`;
    }

    /**
     * Generate server template structure
     */
    generateServerTemplate() {
        return `
📁 IoT Server Project Structure:

├── src/
│   ├── main.py             # Main application
│   ├── mqtt_handler.py     # MQTT message processing
│   ├── database.py         # Database operations
│   ├── api/
│   │   ├── routes.py       # API endpoints
│   │   └── auth.py         # Authentication
│   └── models/
│       ├── sensor.py       # Sensor data models
│       └── device.py       # Device models
├── config/
│   ├── settings.py         # Application settings
│   ├── mqtt.conf           # MQTT configuration
│   └── database.conf       # Database configuration
├── tests/                  # Test suite
├── docs/
│   ├── API.md              # API documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   └── MQTT.md             # MQTT protocol docs
├── docker-compose.yml      # Container orchestration
├── Dockerfile              # Container definition
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
├── README.md               # Project documentation
└── LICENSE                 # License file

🔧 Recommended requirements.txt:
fastapi==0.104.1
uvicorn[standard]==0.24.0
paho-mqtt==1.6.1
influxdb-client==1.38.0
redis==5.0.1
python-dotenv==1.0.0
pydantic==2.5.0
`;
    }

    /**
     * Generate documentation template structure
     */
    generateDocumentationTemplate() {
        return `
📁 IoT Documentation Project Structure:

├── docs/
│   ├── getting-started/
│   │   ├── installation.md
│   │   ├── quick-start.md
│   │   └── requirements.md
│   ├── hardware/
│   │   ├── sensor-specs.md
│   │   ├── wiring-diagrams.md
│   │   └── pcb-designs.md
│   ├── software/
│   │   ├── firmware-guide.md
│   │   ├── api-reference.md
│   │   └── protocols.md
│   ├── deployment/
│   │   ├── cloud-setup.md
│   │   ├── local-setup.md
│   │   └── monitoring.md
│   └── troubleshooting/
│       ├── common-issues.md
│       ├── debugging.md
│       └── faq.md
├── examples/
│   ├── basic-sensor/
│   ├── mqtt-client/
│   └── full-system/
├── assets/
│   ├── images/
│   ├── diagrams/
│   └── videos/
├── scripts/
│   ├── build-docs.py
│   └── validate-links.py
├── README.md
├── CONTRIBUTING.md
└── LICENSE
`;
    }

    /**
     * Generate infrastructure template structure
     */
    generateInfrastructureTemplate() {
        return `
📁 IoT Infrastructure Project Structure:

├── docker/
│   ├── Dockerfile.mqtt     # MQTT broker
│   ├── Dockerfile.api      # API server
│   ├── Dockerfile.ui       # Web interface
│   └── Dockerfile.worker   # Background workers
├── k8s/
│   ├── namespace.yaml      # Kubernetes namespace
│   ├── configmap.yaml      # Configuration
│   ├── secrets.yaml        # Secrets management
│   ├── mqtt-deployment.yaml
│   ├── api-deployment.yaml
│   └── ingress.yaml        # Load balancer
├── terraform/
│   ├── main.tf             # Infrastructure definition
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
├── monitoring/
│   ├── prometheus.yml      # Metrics collection
│   ├── grafana/            # Dashboards
│   └── alerts.yml          # Alert rules
├── security/
│   ├── policies/           # Security policies
│   ├── certificates/       # SSL certificates
│   └── firewall.rules      # Network security
├── scripts/
│   ├── deploy.sh           # Deployment script
│   ├── backup.sh           # Backup script
│   └── restore.sh          # Restore script
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production setup
├── README.md               # Setup documentation
└── LICENSE                 # License file
`;
    }
}

module.exports = IoTManager;
