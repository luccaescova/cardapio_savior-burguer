document.addEventListener('DOMContentLoaded', () => {
  loadAvailablePrinters();

  document.getElementById('btnSavePrinter')?.addEventListener('click', saveSelectedPrinter);
});

// Busca as impressoras disponíveis no Windows
async function loadAvailablePrinters() {
  const select = document.getElementById('printerSelect');
  const status = document.getElementById('printerStatus');

  try {
    const res = await fetch('/api/admin/printers');
    const data = await res.json();

    if (data.success) {
      select.innerHTML = '<option value="">-- Selecione uma impressora --</option>';

      data.printers.forEach(printer => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = printer.name;
        if (printer.name === data.selectedPrinter) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      if (data.selectedPrinter) {
        status.innerHTML = `<span style="color: #4cd137;">Impressora Ativa: "${data.selectedPrinter}"</span>`;
      } else {
        status.innerHTML = `<span style="color: #eccc68;">Nenhuma impressora selecionada no momento.</span>`;
      }
    } else {
      status.innerHTML = `<span style="color: #ff4757;">${data.error}</span>`;
    }
  } catch (err) {
    console.error('Erro ao carregar impressoras:', err);
    select.innerHTML = '<option value="">Erro ao carregar impressoras</option>';
    status.innerHTML = `<span style="color: #ff4757;">Acesse este painel usando http://localhost:3000/admin.html</span>`;
  }
}

// Salva a impressora escolhida no backend
async function saveSelectedPrinter() {
  const select = document.getElementById('printerSelect');
  const status = document.getElementById('printerStatus');
  const selectedName = select.value;

  if (!selectedName) {
    alert('Por favor, selecione uma impressora da lista!');
    return;
  }

  try {
    const res = await fetch('/api/admin/select-printer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: selectedName })
    });

    const data = await res.json();
    if (data.success) {
      status.innerHTML = `<span style="color: #4cd137;">✅ ${data.message}</span>`;
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error('Erro ao salvar impressora:', err);
    alert('Erro ao comunicar com o servidor.');
  }
}