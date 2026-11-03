export type Student = { id:string; user_id?:string; class_id?:string; name:string; registration?:string|null; email?:string|null; phone?:string|null; birth_date?:string|null };
export type SchoolClass = { id:string; user_id?:string; name:string; subject:string; teacher:string; students:Student[] };
export type Lesson = { id:string; user_id?:string; classId:string; date:string; title:string; notes:string; attachment_name?:string|null; attachment_path?:string|null };
export type AttendanceItem = { studentId:string; status:"present"|"absent"|"justified" };
export type Attendance = { lessonId:string; items:AttendanceItem[] };
export type AppData = { classes:SchoolClass[]; lessons:Lesson[]; attendance:Attendance[] };
