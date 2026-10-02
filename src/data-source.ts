import { DataSource } from "typeorm";
import { config } from 'dotenv'

const env = `.env.${process.env.NODE_ENV || 'development'}`

config({
    path: env
})

export default new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
})