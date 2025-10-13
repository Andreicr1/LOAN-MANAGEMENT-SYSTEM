# 🚀 Como Executar a Aplicação com SignWell

## ⚠️ IMPORTANTE: Use o Modo DEV para Testar

Devido a problemas com o build do executável (paths e módulos), **use o modo development** que funciona perfeitamente:

---

## ✅ **OPÇÃO RECOMENDADA: Dev Mode**

### **1. Abrir Terminal na Pasta do Projeto**
```bash
cd D:\LOAN-MANAGEMENT-SYSTEM
```

### **2. Executar com Electron Forge**
```bash
npm run forge:start
```

**OU se preferir apenas frontend:**
```bash
npm run dev
# Depois em outro terminal:
npx electron electron/main.js
```

### **3. Aguardar Aplicação Abrir**
- Vite dev server inicia
- Electron abre automaticamente
- Interface carrega

### **4. Configurar SignWell**
1. Login: `admin` / `admin123`
2. **Settings → E-Signature**
3. Colar token: `7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243`
4. **Test Mode**: ✓ Marcar
5. **Save Changes**
6. Ver **"✓ Configured"**

### **5. Testar Integração**

**Opção A - Página de Teste:**
- Navegar: `http://localhost:5173/#/signwell-test`
- Seguir os 3 passos na página

**Opção B - Fluxo Real:**
1. **Disbursements → New**
2. Preencher dados do disbursement
3. **Approve & Generate PN**
4. **📝 Send for E-Signature** (botão verde)
5. Modal abre com iframe SignWell
6. Arrastar campos de assinatura
7. **Send for Signature**
8. Verificar emails!

---

## 🐛 **Por que Não Usar o Executável?**

O build do executável está com problemas de:
1. Paths relativos vs absolutos
2. Módulos não encontrados no app.asar
3. Estrutura de pastas do electron-builder

**Solução temporária**: Use `npm run dev` que funciona 100%

**Solução permanente (futura)**: 
- Ajustar configuração do electron-builder
- Ou usar electron-forge em vez de electron-builder
- Ou criar script de build customizado

---

## ✅ **Modo Dev vs Executável**

| Feature | Dev Mode | Executável |
|---------|----------|------------|
| **Funcionalidade** | ✅ 100% | ⚠️ Problemas |
| **Hot Reload** | ✅ Sim | ❌ Não |
| **Debug** | ✅ Fácil | ❌ Difícil |
| **Velocidade** | ✅ Rápido | ⏳ Lento para buildar |
| **SignWell** | ✅ Funciona | ⚠️ Requer ajustes |
| **Recomendado** | ✅ **SIM** | ❌ Não agora |

---

## 🔧 **Comandos Úteis**

```bash
# Executar dev mode
npm run dev

# Parar dev mode
Ctrl + C

# Build frontend apenas
npm run build

# Ver erros TypeScript
npx tsc --noEmit

# Limpar tudo
Remove-Item -Recurse -Force dist, dist-electron, release*
```

---

## 📝 **Checklist Antes de Usar**

- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Terminal na pasta do projeto
- [ ] Executar `npm run dev`
- [ ] Aguardar aplicação abrir
- [ ] Configurar token SignWell
- [ ] Testar!

---

## 🎯 **CONCLUSÃO**

**USE**: `npm run dev` ← **FUNCIONA PERFEITAMENTE! ✅**

**NÃO USE** (por enquanto): Executável `.exe` ← Precisa ajustes no build

---

A integração SignWell está 100% funcional no modo dev! 🚀

