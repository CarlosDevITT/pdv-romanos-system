// check-supabase.js - Verificador de Status do Supabase
class SupabaseChecker {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        console.log('🔍 Iniciando verificação do Supabase...');
        await this.initializeSupabase();
        await this.checkConnection();
        await this.checkTables();
        await this.checkPolicies();
        await this.checkStorage();
    }

    async initializeSupabase() {
        try {
            const SUPABASE_URL = 'https://zgrevlntkgmonqxyhjww.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncmV2bG50a2dtb25xeHloand3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjMxNjksImV4cCI6MjA3NjY5OTE2OX0.9svTC7fzUWgZXOraUcNOifl5XwgZfvwwzEWHanN2aP0';
            
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Cliente Supabase inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
        }
    }

    async checkConnection() {
        console.log('\n📡 Verificando conexão...');
        try {
            const { data, error } = await this.supabase.from('products').select('count').limit(1);
            
            if (error) {
                console.log('❌ Erro na conexão:', error.message);
                return false;
            }
            
            console.log('✅ Conexão com Supabase estabelecida com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Falha na conexão:', error);
            return false;
        }
    }

    async checkTables() {
        console.log('\n📊 Verificando tabelas...');
        
        const tables = ['products'];
        
        for (const table of tables) {
            try {
                const { data, error } = await this.supabase.from(table).select('*').limit(1);
                
                if (error && error.code === '42P01') {
                    console.log(`❌ Tabela "${table}" não existe`);
                } else if (error) {
                    console.log(`⚠️ Tabela "${table}" existe mas com erro:`, error.message);
                } else {
                    console.log(`✅ Tabela "${table}" existe e está acessível`);
                }
            } catch (error) {
                console.error(`❌ Erro ao verificar tabela ${table}:`, error);
            }
        }
    }

    async checkPolicies() {
        console.log('\n🛡️ Verificando políticas (policies)...');
        
        // Testar operações CRUD
        const testProduct = {
            name: 'Produto Teste',
            category: 'teste',
            price: 10.00,
            stock: 1,
            description: 'Produto para teste de políticas'
        };

        // Teste INSERT
        try {
            const { data, error } = await this.supabase.from('products').insert([testProduct]).select();
            if (error) {
                console.log('❌ Política INSERT bloqueada:', error.message);
            } else {
                console.log('✅ Política INSERT permitida');
                const productId = data[0].id;
                
                // Teste SELECT
                const { error: selectError } = await this.supabase.from('products').select('*').eq('id', productId);
                if (selectError) {
                    console.log('❌ Política SELECT bloqueada:', selectError.message);
                } else {
                    console.log('✅ Política SELECT permitida');
                }

                // Teste UPDATE
                const { error: updateError } = await this.supabase.from('products').update({ name: 'Produto Atualizado' }).eq('id', productId);
                if (updateError) {
                    console.log('❌ Política UPDATE bloqueada:', updateError.message);
                } else {
                    console.log('✅ Política UPDATE permitida');
                }

                // Teste DELETE
                const { error: deleteError } = await this.supabase.from('products').delete().eq('id', productId);
                if (deleteError) {
                    console.log('❌ Política DELETE bloqueada:', deleteError.message);
                } else {
                    console.log('✅ Política DELETE permitida');
                }
            }
        } catch (error) {
            console.error('❌ Erro nos testes de políticas:', error);
        }
    }

    async checkStorage() {
        console.log('\n📦 Verificando Storage...');
        
        try {
            const { data, error } = await this.supabase.storage.from('product-images').list();
            
            if (error && error.message.includes('bucket')) {
                console.log('❌ Bucket "product-images" não existe');
            } else if (error) {
                console.log('⚠️ Erro no storage:', error.message);
            } else {
                console.log('✅ Bucket "product-images" existe e está acessível');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar storage:', error);
        }
    }

    async createMissingResources() {
        console.log('\n🔨 Criando recursos faltantes...');
        
        // SQL para criar a tabela products se não existir
        const createTableSQL = `
        CREATE TABLE IF NOT EXISTS products (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            stock INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT true,
            description TEXT,
            image_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );`;

        // SQL para habilitar RLS
        const enableRLSSQL = `ALTER TABLE products ENABLE ROW LEVEL SECURITY;`;

        // SQL para criar políticas (policies)
        const policiesSQL = `
        -- Política para SELECT (leitura)
        CREATE POLICY "Permitir SELECT para todos" ON products
            FOR SELECT USING (true);
        
        -- Política para INSERT (inserção)
        CREATE POLICY "Permitir INSERT para todos" ON products
            FOR INSERT WITH CHECK (true);
        
        -- Política para UPDATE (atualização)
        CREATE POLICY "Permitir UPDATE para todos" ON products
            FOR UPDATE USING (true);
        
        -- Política para DELETE (exclusão)
        CREATE POLICY "Permitir DELETE para todos" ON products
            FOR DELETE USING (true);
        `;

        console.log('📋 Execute estes comandos SQL no editor SQL do Supabase:');
        console.log('\n1. Criar tabela:');
        console.log(createTableSQL);
        console.log('\n2. Habilitar RLS:');
        console.log(enableRLSSQL);
        console.log('\n3. Criar políticas:');
        console.log(policiesSQL);
    }
}

// Executar verificações quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando verificações do Supabase...');
    const checker = new SupabaseChecker();
    
    // Adicionar botão para criar recursos faltantes
    const button = document.createElement('button');
    button.textContent = '🔨 Mostrar SQL para Criar Recursos Faltantes';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #8b5cf6;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    `;
    button.onclick = () => checker.createMissingResources();
    document.body.appendChild(button);
});