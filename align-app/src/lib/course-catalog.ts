// Real course catalog from docs/01-requirements/01-spec/plo-course-master-data.md (สาขา New
// Media Communication) — reference data, not test fixtures. Used to populate the course
// dropdown in /courses/new instead of free-text entry, per curriculum year.
export interface CatalogCourse {
  code: string;
  nameTh: string;
  nameEn: string;
}

export const COURSE_CATALOG: Record<string, CatalogCourse[]> = {
  "2565": [
    // วิชาพื้นฐานวิชาชีพ
    { code: "100005", nameTh: "กฎหมายและจริยธรรมสื่อมวลชน", nameEn: "Laws and Ethics for Mass Communication" },
    { code: "125111", nameTh: "หลักนิเทศศาสตร์", nameEn: "Principles of Communication Arts" },
    { code: "125121", nameTh: "ภาษาเพื่อการสื่อสาร", nameEn: "Language for Communication" },
    { code: "125212", nameTh: "จิตวิทยาเพื่อการสื่อสาร", nameEn: "Psychology for Communication" },
    { code: "127111", nameTh: "ความรู้ทั่วไปทางการสื่อสารมวลชนและสื่อใหม่", nameEn: "Introduction to Mass Communication and New Media" },
    { code: "127311", nameTh: "ระเบียบวิธีวิจัย", nameEn: "Research Methodology" },
    // วิชาเอกบังคับ
    { code: "127121", nameTh: "การรู้เท่าทันสื่อดิจิทัล", nameEn: "Digital Media Literacy" },
    { code: "127122", nameTh: "การถ่ายภาพดิจิทัลเพื่อการสื่อสาร", nameEn: "Digital Photography for Communication" },
    { code: "127221", nameTh: "การเขียนบทสำหรับสื่อออนไลน์", nameEn: "Script Writing for Online Media" },
    { code: "127222", nameTh: "การคิดสร้างสรรค์ด้านการสื่อสาร", nameEn: "Creative Thinking for Communication" },
    { code: "127223", nameTh: "การสร้างสรรค์ภาพและเสียงดิจิทัล", nameEn: "Digital Visual and Sound Creation" },
    { code: "127224", nameTh: "การตัดต่อดิจิทัลเบื้องต้น", nameEn: "Digital Editing Basic" },
    { code: "127225", nameTh: "การถ่ายภาพเคลื่อนไหวเพื่อการเล่าเรื่อง", nameEn: "Motion Picture for Storytelling" },
    { code: "127226", nameTh: "แพลตฟอร์มและเครือข่ายการสื่อสารศึกษา", nameEn: "Platform and Communication Study" },
    { code: "127227", nameTh: "การเล่าเรื่องแบบบูรณาการสื่อ", nameEn: "Trans-Media Storytelling" },
    { code: "127228", nameTh: "การออกแบบกราฟิกเพื่องานสื่อสารมวลชน", nameEn: "Graphic Design for Mass Communication" },
    { code: "127321", nameTh: "ข่าวเบื้องต้น", nameEn: "Introduction to News" },
    { code: "127322", nameTh: "การผลิตเนื้อหาสำหรับสื่อออนไลน์", nameEn: "Production for Online Media" },
    { code: "127323", nameTh: "สื่อภาคพลเมือง", nameEn: "Citizen Media" },
    { code: "127324", nameTh: "การบริหารจัดการผู้ใช้สื่อ", nameEn: "Media User Management" },
    { code: "127325", nameTh: "วารสารศาสตร์ข้อมูลดิจิทัล", nameEn: "Digital Data Journalism" },
    { code: "127421", nameTh: "โครงงานการสื่อสารสื่อใหม่", nameEn: "New Media Communication Project" },
    { code: "127422", nameTh: "การบริหารองค์กรสื่อ", nameEn: "Media Organization Management" },
    { code: "146273", nameTh: "ภาษาอังกฤษสำหรับงานด้านนิเทศศาสตร์", nameEn: "English for Communication Arts" },
    // วิชาเอกเลือก — กลุ่มการสื่อสารเพื่อสาธารณะ
    { code: "127231", nameTh: "การจัดการเนื้อหาจากมวลชน", nameEn: "Crowdsource Management" },
    { code: "127232", nameTh: "ภูมิทัศน์สื่อในภูมิภาคอาเซียน", nameEn: "Asian Media Landscape" },
    { code: "127331", nameTh: "การผลิตรายการข่าว", nameEn: "News Program Production" },
    { code: "127332", nameTh: "วารสารศาสตร์ด้านภาพ", nameEn: "Visual Journalism" },
    { code: "127333", nameTh: "การสื่อสารเพื่อการจัดการภัยพิบัติ", nameEn: "Communication for Disaster Management" },
    { code: "127431", nameTh: "การเขียนข่าวเชิงลึก", nameEn: "In-depth News" },
    // วิชาเอกเลือก — กลุ่มการสื่อสารเชิงพาณิชย์
    { code: "127241", nameTh: "การพูดและการใช้เสียงเพื่องานสื่อสารมวลชน", nameEn: "Speech and Voice for Mass Communication" },
    { code: "127242", nameTh: "การสร้างเสียงประกอบสำหรับสื่อดิจิทัล", nameEn: "Sound Effect Creation for Digital Media" },
    { code: "127243", nameTh: "การสื่อสารการตลาดเนื้อหาสำหรับสื่อดิจิทัล", nameEn: "Content Marketing Communication for Digital Media" },
    { code: "127341", nameTh: "ภาพยนตร์เบื้องต้น", nameEn: "Introduction to Film" },
    { code: "127342", nameTh: "การผลิตภาพยนตร์", nameEn: "Film Production" },
    { code: "127441", nameTh: "การตัดต่อดิจิทัลขั้นสูง", nameEn: "Advanced Digital Editing" },
    // ฝึกงาน/สหกิจศึกษา/การศึกษาอิสระ
    { code: "127451", nameTh: "การฝึกงาน", nameEn: "Professional Training" },
    { code: "127452", nameTh: "สหกิจศึกษา", nameEn: "Co-Operative Education" },
    { code: "127453", nameTh: "การศึกษาอิสระ", nameEn: "Independent Study" },
  ],
  "2570": [
    // วิชาเอกบังคับ
    { code: "67146200", nameTh: "ภาษาอังกฤษเพื่อวัตถุประสงค์เฉพาะ", nameEn: "English for Specific Purposes" },
    { code: "70100005", nameTh: "กฎหมายและจริยธรรมสำหรับสื่อมวลชนและผู้ผลิตเนื้อหา", nameEn: "Laws and Ethics for Mass Media and Content Creator" },
    { code: "70127111", nameTh: "หลักการสื่อสารและสื่อมวลชนดิจิทัล", nameEn: "Principles of Communication and Digital Mass Media" },
    { code: "70127112", nameTh: "ภาษาไทยเพื่อการสื่อสารทางวิชาชีพ", nameEn: "Thai Language for Professional Communication" },
    { code: "70127113", nameTh: "จิตวิทยาเพื่อการสื่อสารและพฤติกรรมผู้ใช้สื่อ", nameEn: "Psychology for Communication and Media User Behavior" },
    { code: "70127121", nameTh: "การรู้เท่าทันสื่อดิจิทัลและการตรวจสอบข้อเท็จจริง", nameEn: "Digital Media Literacy and Factchecking" },
    { code: "70127122", nameTh: "การคิดสร้างสรรค์และนวัตกรรมการสื่อสาร", nameEn: "Creative Thinking and Communication Innovation" },
    { code: "70127123", nameTh: "การถ่ายภาพดิจิทัลเพื่อการสื่อสาร", nameEn: "Digital Photography for Communication" },
    { code: "70127211", nameTh: "การบริหารจัดการแพลตฟอร์มโซเชียลมีเดียและอัลกอริทึมศึกษา", nameEn: "Social Media Platform Management and Algorithm Study" },
    { code: "70127212", nameTh: "การเล่าเรื่องดิจิทัลและการเขียนบท", nameEn: "Digital Storytelling and Script Writing" },
    { code: "70127213", nameTh: "การถ่ายภาพเคลื่อนไหวและการตัดต่อดิจิทัลเบื้องต้น", nameEn: "Videography and Basic Digital Editing" },
    { code: "70127221", nameTh: "วารสารศาสตร์ข้อมูลและการเล่าเรื่องด้วยภาพ", nameEn: "Data Journalism and Visual Storytelling" },
    { code: "70127222", nameTh: "การออกแบบกราฟิกและการออกแบบสื่อ", nameEn: "Graphic Design and Media Design" },
    { code: "70127223", nameTh: "การตัดต่อดิจิทัลขั้นสูงและการทำสี", nameEn: "Advanced Digital Editing and Color Grading" },
    { code: "70127311", nameTh: "ระเบียบวิธีวิจัย", nameEn: "Research Methodology" },
    { code: "70127312", nameTh: "การผลิตเนื้อหาแบบสั้นสำหรับสื่อออนไลน์", nameEn: "Short-form Content Production for Online Media" },
    { code: "70127313", nameTh: "ข่าวและการรายงานข่าวดิจิทัล", nameEn: "News and Digital Journalism" },
    { code: "70127314", nameTh: "สื่อท้องถิ่นและการสื่อสารชุมชน", nameEn: "Local Media and Community Communication" },
    { code: "70127321", nameTh: "กลยุทธ์การสืบค้นและการตลาดเนื้อหาผ่านเครื่องมือดิจิทัล", nameEn: "Search Strategy and Digital Content Marketing Tools" },
    { code: "70127322", nameTh: "การถ่ายทอดสดและการสตรีมมิ่ง", nameEn: "Live Streaming and Broadcasting" },
    { code: "70127320", nameTh: "โครงงานการสื่อสารสื่อใหม่ 1", nameEn: "New Media Communication Project 1" },
    { code: "70127410", nameTh: "โครงงานการสื่อสารสื่อใหม่ 2", nameEn: "New Media Communication Project 2" },
    { code: "70127411", nameTh: "การเป็นผู้ประกอบการสื่อและการสร้างรายได้", nameEn: "Media Entrepreneurship and Monetization" },
    { code: "70127412", nameTh: "การผลิตเนื้อหาแบบยาวสำหรับสื่อออนไลน์", nameEn: "Long-form Content Production for Online Media" },
    // วิชาเอกเลือก — กลุ่มการสื่อสารสาธารณะ
    { code: "70127228", nameTh: "การสร้างสรรค์เนื้อหาการอธิบายสำหรับสื่อใหม่", nameEn: "Explainer Content Creation for New Media" },
    { code: "70127318", nameTh: "การสื่อสารเพื่อการเปลี่ยนแปลง", nameEn: "Communication for Change" },
    { code: "70127328", nameTh: "การสื่อสารเพื่อการลดความเสี่ยงจากภัยพิบัติ", nameEn: "Communication for Disaster Risk Reduction" },
    { code: "70127418", nameTh: "การสร้างสรรค์แคมเปญสื่อสารเพื่อผลกระทบทางสังคม", nameEn: "Creative Communication Campaigns for Social Impact" },
    // วิชาเอกเลือก — กลุ่มการสื่อสารเชิงพาณิชย์
    { code: "70127229", nameTh: "การสร้างสรรค์เนื้อหาสำหรับสื่อเสียงดิจิทัล", nameEn: "Digital Audio Content Creation for Digital Media" },
    { code: "70127319", nameTh: "กลยุทธ์การตลาดดิจิทัลและการสร้างแบรนด์บุคคล", nameEn: "Digital Marketing Strategy and Personal Branding" },
    { code: "70127329", nameTh: "การสื่อสารการตลาดแบบเรียลไทม์และการสร้างสรรค์ไลฟ์คอมเมิร์ซ", nameEn: "Real-time Marketing Communication and Creative Live Commerce" },
    { code: "70127419", nameTh: "การผลิตภาพยนตร์เชิงพาณิชย์", nameEn: "Commercial Film Production" },
    // ฝึกงาน/สหกิจศึกษา/การศึกษาอิสระ
    { code: "70127421", nameTh: "การฝึกงาน", nameEn: "Professional Training" },
    { code: "70127422", nameTh: "สหกิจศึกษา", nameEn: "Co-Operative Education" },
    { code: "70127423", nameTh: "การศึกษาอิสระ", nameEn: "Independent Study" },
  ],
};
