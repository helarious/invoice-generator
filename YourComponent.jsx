html2canvas(element, {
    scale: 1,
    useCORS: true,
    logging: false,
    imageTimeout: 0
}); 

const doc = new jsPDF({
    compress: true,
    precision: 2,
    unit: 'pt'
}); 