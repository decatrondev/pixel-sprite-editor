// --- Módulo: Configuración de la Base de Datos (database.js) ---
// Propósito: Establecer y exportar la conexión a la base de datos PostgreSQL.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    max: 10
});

// Función para verificar y crear las tablas necesarias si no existen
async function createTables() {
    const client = await pool.connect();
    try {
        console.log('Conexión a la base de datos establecida correctamente.');

        // Crear tabla de usuarios
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabla 'users' verificada/creada correctamente.");

        // Crear tabla de proyectos de sprites
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                project_name VARCHAR(100) NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                json_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabla 'projects' verificada/creada correctamente.");

        // Crear tabla de proyectos de pixel art
        await client.query(`
            CREATE TABLE IF NOT EXISTS pixelart_projects (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                project_name VARCHAR(100) NOT NULL,
                canvas_width INT NOT NULL,
                canvas_height INT NOT NULL,
                image_data TEXT NOT NULL,
                frames_data TEXT,
                palette JSONB,
                settings JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabla 'pixelart_projects' verificada/creada correctamente.");

        // Crear índice
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_pixelart_user_projects
            ON pixelart_projects (user_id, updated_at)
        `);

        // Crear función y trigger para updated_at automático
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // Trigger para updated_at en projects
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
                    CREATE TRIGGER update_projects_updated_at
                    BEFORE UPDATE ON projects
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
        `);

        // Trigger para updated_at en pixelart_projects
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pixelart_projects_updated_at') THEN
                    CREATE TRIGGER update_pixelart_projects_updated_at
                    BEFORE UPDATE ON pixelart_projects
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
        `);

        client.release();
    } catch (error) {
        client.release();
        console.error('Error al inicializar la base de datos:', error);
        process.exit(1);
    }
}

module.exports = { pool, createTables };
