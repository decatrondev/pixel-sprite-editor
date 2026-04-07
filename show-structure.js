const fs = require('fs');
const path = require('path');

// Archivos y carpetas a omitir
const IGNORE_LIST = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'coverage',
    '.nyc_output',
    'package-lock.json',
    'yarn.lock',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '.DS_Store',
    'Thumbs.db',
    '.vscode',
    '.idea',
    '*.log',
    '.cache',
    '.temp',
    '.tmp',
    '__pycache__',
    '*.pyc',
    '.pytest_cache'
];

// Extensiones de archivos a mostrar
const SHOW_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.html', '.css', '.scss',
    '.vue', '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb', '.go', '.rs',
    '.ejs' // 👈 agregado para que sí se muestren
];

function shouldIgnore(itemName, itemPath) {
    // Verificar si está en la lista de ignorados
    for (const ignore of IGNORE_LIST) {
        if (ignore.includes('*')) {
            const pattern = ignore.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(itemName)) {
                return true;
            }
        } else if (itemName === ignore) {
            return true;
        }
    }

    // Verificar archivos ocultos (que empiecen con punto)
    if (itemName.startsWith('.') && itemName !== '.gitignore' && itemName !== '.env.example') {
        return true;
    }

    return false;
}

function shouldShowFile(fileName) {
    if (!SHOW_EXTENSIONS || SHOW_EXTENSIONS.length === 0) {
        return true;
    }

    const ext = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, ext).toLowerCase();

    const importantFiles = ['readme', 'license', 'dockerfile', 'makefile'];
    if (importantFiles.includes(baseName)) {
        return true;
    }

    return SHOW_EXTENSIONS.includes(ext);
}

function getDirectoryStructure(dirPath, prefix = '', isLast = true) {
    let result = '';

    try {
        const items = fs.readdirSync(dirPath);

        const filteredItems = items.filter(item => {
            const itemPath = path.join(dirPath, item);
            return !shouldIgnore(item, itemPath);
        });

        const dirs = [];
        const files = [];

        filteredItems.forEach(item => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                dirs.push(item);
            } else if (shouldShowFile(item)) {
                files.push(item);
            }
        });

        dirs.sort();
        files.sort();

        const allItems = [...dirs, ...files];

        allItems.forEach((item, index) => {
            const itemPath = path.join(dirPath, item);
            const isLastItem = index === allItems.length - 1;
            const stats = fs.statSync(itemPath);

            const connector = isLastItem ? '└── ' : '├── ';
            const nextPrefix = prefix + (isLastItem ? '    ' : '│   ');

            if (stats.isDirectory()) {
                result += `${prefix}${connector}📁 ${item}/\n`;
                result += getDirectoryStructure(itemPath, nextPrefix, isLastItem);
            } else {
                const emoji = getFileEmoji(item);
                result += `${prefix}${connector}${emoji} ${item}\n`;
            }
        });

    } catch (error) {
        result += `${prefix}❌ Error leyendo directorio: ${error.message}\n`;
    }

    return result;
}

function getFileEmoji(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const name = path.basename(fileName, ext).toLowerCase();

    const emojiMap = {
        '.js': '🟨',
        '.ts': '🔷',
        '.jsx': '⚛️',
        '.tsx': '⚛️',
        '.json': '📄',
        '.md': '📝',
        '.html': '🌐',
        '.css': '🎨',
        '.scss': '🎨',
        '.vue': '💚',
        '.py': '🐍',
        '.java': '☕',
        '.php': '🐘',
        '.rb': '💎',
        '.go': '🐹',
        '.rs': '🦀',
        '.ejs': '📋',
        '.hbs': '🔧',
        '.handlebars': '🔧',
        '.pug': '🐶',
        '.jade': '🐶'
    };

    const nameMap = {
        'package': '📦',
        'readme': '📖',
        'license': '📜',
        'dockerfile': '🐳',
        'makefile': '🔧'
    };

    return nameMap[name] || emojiMap[ext] || '📄';
}

function main() {
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    console.log(`\n🚀 Estructura del proyecto: ${projectName}`);
    console.log('='.repeat(50));
    console.log(`📍 Ruta: ${projectPath}\n`);

    console.log(`📁 ${projectName}/`);
    const structure = getDirectoryStructure(projectPath);
    console.log(structure);

    console.log('='.repeat(50));
    console.log('✨ Estructura generada exitosamente!');
}

if (require.main === module) {
    main();
}
