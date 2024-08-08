import ExcelEditor from './excel-editor';

const ExcelPage: React.FC = () => {
  const excelFileUrl = "https://pittampalli-my.sharepoint.com/:x:/p/vinod/EVX_ru95pHZAuRuHvf43wtYBB9NcIz0dm7yw2oVpR26OcA?e=Krk5dJ&action=embedview&wdAllowInteractivity=True&wdbipreview=True";

  return (
    <div>
      <h1>Excel Editor</h1>
      <ExcelEditor fileUrl={excelFileUrl} />
    </div>
  );
};

export default ExcelPage;