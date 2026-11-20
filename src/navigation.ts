export interface MenuItem {
  id: string
  label: string
  children?: MenuItem[]
}

export interface MenuGroup {
  id: string
  label: string
  items: MenuItem[]
}

const group = (id: string, label: string, items: MenuItem[]): MenuGroup => ({ id, label, items })
const item = (id: string, label: string, children?: MenuItem[]): MenuItem => ({ id, label, children })

export const menuGroups: MenuGroup[] = [
  group('academic', 'Academic', [
    item('information', 'Information', [
      item('students.search', 'Search student'), item('teachers', 'Teachers'), item('staff', 'Staff'),
      item('committee', 'Committee'), item('classes', 'Classes'), item('sections', 'Houses / sections'),
      item('students', 'Students'), item('students.transferred', 'TC students'), item('students.inactive', 'Inactive / deleted students'),
    ]),
    item('subjects', 'Subjects', [item('subjects.list', 'Subjects'), item('subjects.assign', 'Assigned subjects'), item('subjects.students', 'Student subject assignment')]),
    item('exams.main', 'Main exam', [
      item('exams', 'Exams'), item('exams.marks', 'Main exam mark input'), item('exams.tokens', 'Seat tokens'),
      item('exams.admit-cards', 'Admit cards'), item('exams.routines', 'Exam routines'),
      item('exams.attendance', 'Exam attendance'), item('exams.mark-sheets', 'Mark input sheets'),
    ]),
    item('exams.model', 'Model tests', [
      item('model-exams', 'Model test exams'), item('model.marks', 'Model test mark input'), item('model.tokens', 'Seat tokens'),
      item('model.admit-cards', 'Admit cards'), item('model.routines', 'Exam routines'), item('model.attendance', 'Exam attendance'), item('model.mark-sheets', 'Mark input sheets'),
    ]),
    item('exams.class-test', 'Class tests', [
      item('class-tests', 'Class test exams'), item('class-test.routines', 'Class test routines'), item('class-test.marks', 'Class test mark input'),
      item('class-test.tokens', 'Seat tokens'), item('class-test.attendance', 'Exam attendance'), item('class-test.mark-sheets', 'Mark input sheets'),
    ]),
    item('reports.main-exam', 'Main exam reports', [
      item('reports.main.tabulation', 'Tabulation sheet'), item('reports.main.standings', 'Standings'), item('reports.main.top-students', 'Top students'),
      item('reports.main.marksheets', 'Student marksheets'), item('reports.main.subject-grades', 'Subject wise grades'), item('reports.main.failures', 'Exam fail report'),
    ]),
    item('reports.model-test', 'Model test reports', [
      item('reports.model.tabulation', 'Tabulation sheet'), item('reports.model.standings', 'Standings'), item('reports.model.top-students', 'Top students'),
      item('reports.model.marksheets', 'Student marksheets'), item('reports.model.subject-grades', 'Subject wise grades'), item('reports.model.failures', 'Exam fail report'),
    ]),
    item('reports.class-test', 'Class test reports', [item('reports.class.tabulation', 'Tabulation sheet'), item('reports.class.marksheets', 'Class test mark sheets'), item('reports.class.results', 'Class test results')]),
    item('reports.general', 'General reports', [
      item('reports.students', 'Student information'), item('reports.export', 'Student data export'), item('reports.registration', 'Student registration documents'), item('reports.exam-attendance', 'Exam attendance sheets'),
    ]),
  ]),
  group('management', 'Management', [item('library', 'Library', [item('library.books', 'Manage books'), item('library.issues', 'Issue / return')])]),
  group('communications', 'Communications', [item('messaging', 'Messaging', [item('messages.send', 'Send message'), item('messages.results', 'Result SMS'), item('messages.templates', 'Message templates'), item('messages.reports', 'SMS reports')])]),
  group('activity', 'Activity', [
    item('attendance', 'Attendance', [
      item('attendance.dashboard', 'Dashboard'), item('attendance.digital', 'Digital attendance'), item('attendance.teachers', 'Teacher attendance entry'),
      item('attendance.staff', 'Staff attendance entry'), item('attendance.subjects', 'Subject attendance'), item('attendance.schedule', 'Time schedule'),
      item('attendance.student-reports', 'Student reports', [
        item('attendance.reports.class', 'Class wise present'), item('attendance.reports.daily', 'Daily'), item('attendance.reports.monthly', 'Monthly'),
        item('attendance.reports.summary', 'Attendance summary'), item('attendance.reports.subject', 'Subject wise'), item('attendance.reports.subject-daily', 'Subject daily'),
        item('attendance.reports.subject-all', 'All subject summary'), item('attendance.reports.subject-monthly', 'Subject monthly sheet'), item('attendance.reports.collegiate', 'Collegiate status'),
        item('attendance.reports.yearly', 'Yearly'), item('attendance.reports.single-student', 'Single student'), item('attendance.reports.glance', 'At a glance'),
      ]),
      item('attendance.teacher-reports', 'Teacher reports', [item('attendance.teacher-daily', 'Teacher daily report'), item('attendance.teacher-monthly', 'Teacher monthly sheet'), item('attendance.teacher-yearly', 'Teacher yearly report'), item('attendance.teacher-single', 'Single teacher report')]),
      item('attendance.staff-reports', 'Staff reports', [item('attendance.staff-daily', 'Staff daily report')]),
    ]),
    item('leaves', 'Leave management'),
  ]),
  group('admissions', 'Admissions', [
    item('admissions', 'Admissions', [item('admissions.dashboard', 'Dashboard'), item('admissions.forms', 'Admission forms'), item('admissions.create', 'Create admission'), item('admissions.enroll', 'Enroll student'), item('admissions.reports', 'Admission reports'), item('admissions.public', 'Public admission page')]),
  ]),
  group('finance', 'Pay panel', [
    item('finance', 'Pay panel', [
      item('finance.dashboard', 'Dashboard'), item('finance.packages', 'Pay packages'), item('finance.package-details', 'Package details'), item('finance.dates', 'Pay date settings'),
      item('finance.students', 'Pay student information'), item('finance.bills', 'Bill generation'), item('finance.transactions', 'Transactions'), item('finance.transfers', 'Payment transfers'),
      item('finance.reports', 'Reports', [item('finance.reports.cumulative', 'Cumulative fees'), item('finance.reports.daily', 'Daily collection'), item('finance.reports.gateway', 'Gateway transactions'), item('finance.reports.dues', 'Class dues'), item('finance.reports.ledger', 'Student ledger'), item('finance.reports.all', 'All transactions'), item('finance.reports.monthly-balance', 'Monthly student balance'), item('finance.reports.provider-fees', 'Service fees'), item('finance.reports.dashboard', 'All reports')]),
      item('finance.public', 'Public payment page'),
    ]),
  ]),
  group('printing', 'Printing services', [
    item('printing', 'ID card printing', [item('printing.students', 'Student ID cards'), item('printing.teachers', 'Teacher ID cards'), item('printing.staff', 'Staff ID cards'), item('printing.designer', 'Card designer and templates')]),
    item('printing.testimonials', 'Testimonial printing'), item('printing.general-testimonials', 'General testimonials'), item('printing.transfers', 'Transfer certificates'),
  ]),
  group('system', 'System', [item('system.settings', 'Settings'), item('system.users', 'Users and access')]),
  group('public', 'Public access', [item('public', 'Public portal', [item('public.main-results', 'Main exam results'), item('public.class-results', 'Class test results'), item('public.admit-cards', 'Admit card download')])]),
]

export function findMenuItem(id: string): MenuItem | undefined {
  const search = (items: MenuItem[]): MenuItem | undefined => {
    for (const entry of items) {
      if (entry.id === id) return entry
      const child = entry.children && search(entry.children)
      if (child) return child
    }
    return undefined
  }
  for (const section of menuGroups) {
    const result = search(section.items)
    if (result) return result
  }
  return undefined
}
