import { AppData } from '../types';

const esc = (v: unknown) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cell = (v: unknown) => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
const row = (values: unknown[]) => `<Row>${values.map(cell).join('')}</Row>`;

export function buildExcelXml(data: AppData) {
  const classRows = data.classes.map(c => row([c.name,c.subject,c.teacher,c.students.length]));
  const studentRows: string[] = [];
  data.classes.forEach(c => c.students.forEach(s => studentRows.push(row([c.name,s.name,s.registration,s.email,s.phone,s.birth_date]))));
  const lessonRows = data.lessons.map(l => {
    const c=data.classes.find(x=>x.id===l.classId);
    return row([c?.name,l.title,new Date(l.date).toLocaleDateString('pt-BR'),l.notes,l.attachment_name]);
  });
  const attendanceRows: string[] = [];
  data.attendance.forEach(a => {
    const l=data.lessons.find(x=>x.id===a.lessonId); const c=data.classes.find(x=>x.id===l?.classId);
    a.items.forEach(item => {
      const st=c?.students.find(x=>x.id===item.studentId);
      attendanceRows.push(row([c?.name,l?.title,l?.date?new Date(l.date).toLocaleDateString('pt-BR'):'',st?.name,item.status]));
    });
  });
  const frequencyRows: string[] = [];
  data.classes.forEach(c => {
    const classLessons = data.lessons.filter(l => l.classId === c.id).sort((a,b)=>a.date.localeCompare(b.date));
    c.students.forEach(st => {
      let p=0,f=0,j=0;
      classLessons.forEach(l => { const item=data.attendance.find(a=>a.lessonId===l.id)?.items.find(i=>i.studentId===st.id); if(item?.status==='present')p++; else if(item?.status==='absent')f++; else if(item?.status==='justified')j++; });
      const total=classLessons.length, pct=total?Math.round(p/total*100):0;
      frequencyRows.push(row([c.name,st.name,p,f,j,total,pct+'%']));
    });
  });
  const sheet=(name,headers,rows)=>`<Worksheet ss:Name="${esc(name)}"><Table>${row(headers)}${rows.join('')}</Table></Worksheet>`;
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>${sheet('Turmas',['Turma','Disciplina','Professor','Alunos'],classRows)}${sheet('Alunos',['Turma','Nome','Matrícula','E-mail','Telefone','Nascimento'],studentRows)}${sheet('Planos de Aula',['Turma','Título','Data','Conteúdo','Anexo'],lessonRows)}${sheet('Presenças',['Turma','Aula','Data','Aluno','Status'],attendanceRows)}${sheet('Frequência',['Turma','Aluno','Presentes','Faltas','Justificadas','Dias Registrados','Frequência'],frequencyRows)}</Workbook>`;
}

export function downloadExcelXml(data: AppData) {
  const xml=buildExcelXml(data);
  if(typeof document==='undefined') throw new Error('A exportação em Excel XML está disponível nesta versão para o navegador.');
  const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`presenca_aula_${new Date().toISOString().slice(0,10)}.xml`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
