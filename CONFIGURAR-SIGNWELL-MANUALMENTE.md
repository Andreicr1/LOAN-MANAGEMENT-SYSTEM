# 🔧 Configurar SignWell Manualmente (Se a Interface Não Salvar)

## Problema
Se você está configurando o token SignWell na interface mas ele não está sendo salvo, use este método manual.

---

## Solução: Inserir Diretamente no Banco de Dados

### **Passo 1: Localizar o Banco de Dados**

O banco fica em:
```
C:\Users\<seu-usuario>\AppData\Roaming\loan-management-system\loan-management.db
```

Ou no console do Electron, deve aparecer:
```
Database initialized at: C:\Users\...\loan-management.db
```

### **Passo 2: Executar SQL**

**Opção A - Via SQLite Browser:**
1. Baixar: https://sqlitebrowser.org/
2. Abrir o arquivo `loan-management.db`
3. Ir em "Execute SQL"
4. Colar e executar:

```sql
UPDATE config 
SET 
  signwell_api_token = '7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243',
  signwell_test_mode = 1
WHERE id = 1;
```

5. Clicar em "Write Changes"
6. Fechar banco
7. Reiniciar aplicação

**Opção B - Via Linha de Comando:**
```bash
# Fechar a aplicação primeiro!

# No PowerShell:
$dbPath = "$env:APPDATA\loan-management-system\loan-management.db"
sqlite3 $dbPath "UPDATE config SET signwell_api_token = '7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243', signwell_test_mode = 1 WHERE id = 1;"

# Abrir aplicação novamente
```

### **Passo 3: Verificar**

1. Abrir aplicação
2. Settings → E-Signature
3. Deve mostrar:
   - Token: `********` (mascarado)
   - Badge: **"✓ Configured"**
   - Test Mode: ✓

---

## Debug: Ver o que está no Banco

```sql
SELECT 
  signwell_api_token,
  signwell_test_mode
FROM config 
WHERE id = 1;
```

**Se estiver NULL**: Token não foi salvo → Use método manual acima

**Se estiver preenchido**: Token está salvo → Problema pode ser em outro lugar

---

## Problema do Iframe Não Gerar

Se o iframe não aparece:

### **1. Verificar Console do Navegador**
No Electron, pressione `F12` ou `Ctrl+Shift+I`:
- Ver erros em vermelho
- Ver mensagens de "SignWell"
- Ver se API está retornando erro

### **2. Verificar Console do Electron**
No terminal onde executou a aplicação:
- Ver mensagens de erro
- Ver "SignWell create document error:"
- Ver "SignWell get embedded URL error:"

### **3. Possíveis Causas:**

**a) Token inválido/expirado:**
```
Erro: "401 Unauthorized"
Solução: Verificar se token está correto
```

**b) PDF não existe:**
```
Erro: "ENOENT: no such file"
Solução: Gerar Promissory Note primeiro
```

**c) Rate limit:**
```
Erro: "429 Too Many Requests"
Solução: Aguardar 1 minuto
```

**d) Network error:**
```
Erro: "Failed to fetch"
Solução: Verificar conexão internet
```

---

## Teste Rápido da API

Para testar se o token funciona:

1. Abrir console do navegador (F12)
2. Colar e executar:

```javascript
// Testar criação de documento
const test = await window.electronAPI.signwell.createDocument({
  name: "Test Document",
  pdfPath: "D:\\LOAN-MANAGEMENT-SYSTEM\\test-document.pdf",
  pdfName: "test.pdf",
  recipients: [
    { name: "Test User", email: "test@example.com" }
  ]
});

console.log("Result:", test);
// Se success: true → Token funciona!
// Se error → Ver mensagem de erro
```

---

## Checklist de Debug

- [ ] Banco de dados tem o token (verificar SQL)
- [ ] Settings mostra "✓ Configured"
- [ ] Console do navegador (F12) não mostra erros
- [ ] Console do Electron não mostra erros
- [ ] PDF existe no caminho especificado
- [ ] Conexão com internet funciona
- [ ] Token não está expirado

---

## Solução Rápida

Execute este comando **com a aplicação FECHADA**:

```bash
# No PowerShell (como administrador):
$db = "$env:APPDATA\loan-management-system\loan-management.db"
sqlite3 $db "UPDATE config SET signwell_api_token = '7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243', signwell_test_mode = 1 WHERE id = 1; SELECT 'Token inserido com sucesso' as result;"
```

Depois abra a aplicação e teste!

---

**Se ainda não funcionar, me envie os erros do console!**

