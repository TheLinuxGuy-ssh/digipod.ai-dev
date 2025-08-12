

// const exportPdf = () => {
// const generatePdfFromHtml = async () => {
//   const input = document.getElementById('pdf-content');
//   if (!input) {
//     console.error("Element with id 'pdf-content' not found.");
//     return;
//   }

//   const canvas = await html2canvas(input);
//   const imgData = canvas.toDataURL('image/png');

//   const pdf = new jsPDF();

//   const imgProps = pdf.getImageProperties(imgData);
//   const pdfWidth = pdf.internal.pageSize.getWidth();
//   const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

//   pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
//   pdf.save('report.pdf');
// };
// return (
//       <div id="pdf-content" className='invisible'>
//         this is something!
//       </div>
// )
// }