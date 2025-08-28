const DocumentationManager = require('./lib/features/DocumentationManager');
const config = require('./config.json');

async function testDocAudit() {
    const docManager = new DocumentationManager(config);
    const result = await docManager.auditDocumentation();

    console.log('📋 DocumentationManager Audit Results:');
    console.log('Overall Score:', result.score + '%');
    console.log('\nFile Analysis:');

    result.files.forEach((file) => {
        const status = file.exists ? '✅' : '❌';
        const percentage =
            file.weight > 0 ? Math.round((file.score / file.weight) * 100) : 0;
        console.log(
            `  ${status} ${file.file} - ${file.score}/${file.weight} (${percentage}%)`
        );

        if (file.issues.length > 0) {
            file.issues.forEach((issue) => console.log(`    ⚠️  ${issue}`));
        }

        if (file.recommendations.length > 0) {
            file.recommendations.forEach((rec) => console.log(`    💡 ${rec}`));
        }
    });

    console.log(
        '\nTotal Weight:',
        result.files.reduce((sum, f) => sum + f.weight, 0)
    );
    console.log(
        'Total Score:',
        result.files.reduce((sum, f) => sum + f.score, 0)
    );
}

testDocAudit().catch(console.error);
