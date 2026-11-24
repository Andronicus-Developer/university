"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSchoolPortalConfig,
  toPortalSchoolType,
  type PortalSchoolType,
  type SchoolPortalConfig,
} from "@/config/schoolPortalConfig";
import { getSchoolFormConfig } from "@/config/schoolFormConfig";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Award,
  UserCheck,
  Phone,
  ShieldCheck,
} from "lucide-react";

interface StudentRecord {
  id: string;
  profile_id: string;
  student_number: string;
  full_name: string;
  email: string;
  phone: string;
  gender?: string;
  account_status: string;
  programme_id: string | null;
  programme_name: string;
  programme_code: string;
  department_id?: string | null;
  department_name?: string;
  intake_id?: string | null;
  degree_level: string;
  entry_term_id: string | null;
  entry_term_name: string;
  cohort_year: number;
  current_level: number;
  status: string;
  admission_date: string;
  gpa: number;
  cgpa: number;
  metadata?: Record<string, any>;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface ProgrammeOption {
  id: string;
  name: string;
  code: string;
  degree_level: string;
  is_active: boolean;
}

interface TermOption {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface IntakeOption {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
  status?: string;
}

interface HostelOption {
  id: string;
  code: string;
  name: string;
  gender_policy?: string;
  is_active?: boolean;
}

interface StudentStats {
  total: number;
  active: number;
  admitted: number;
  graduated: number;
  inactive: number;
  avgCgpa: number;
}

interface StudentFormState {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  student_number: string;
  programme_id: string;
  department_id: string;
  intake_id: string;
  entry_term_id: string;
  cohort_year: number;
  current_level: number;
  status: string;
  admission_date: string;
  gpa: string;
  cgpa: string;
  password: string;
  // University metadata
  level_label: string;
  entry_mode: string;
  residential_status: string;
  hostel_name: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // High School metadata
  stream_track: string;
  boarding_status: string;
  house_dormitory: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
  create_parent_record: boolean;
  create_parent_portal_account: boolean;
  parent_password: string;
  // Vocational metadata
  training_stage: string;
  sponsorship_type: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
}

const STUDENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "admitted", label: "Admitted" },
  { value: "deferred", label: "Deferred" },
  { value: "leave_of_absence", label: "Leave of Absence" },
  { value: "suspended", label: "Suspended" },
  { value: "completed", label: "Completed" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
];

function statusBadgeStyle(status: string) {
  switch (status) {
    case "active":
      return "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]";
    case "admitted":
      return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    case "graduated":
    case "completed":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "deferred":
    case "leave_of_absence":
      return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    default:
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function generateNextStudentNumber(existing: StudentRecord[], year: number, idPrefix: string) {
  const prefix = `${idPrefix}${year}`;
  let maxSeq = 0;
  for (const s of existing) {
    const num = String(s.student_number || "").toUpperCase();
    if (num.startsWith(prefix)) {
      const numPart = parseInt(num.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export default function StudentsManagementPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [intakes, setIntakes] = useState<IntakeOption[]>([]);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [schoolType, setSchoolType] = useState<PortalSchoolType>("university");

  const portalConfig: SchoolPortalConfig = useMemo(
    () => getSchoolPortalConfig(schoolType),
    [schoolType]
  );
  const formSpec = useMemo(() => getSchoolFormConfig(schoolType).student, [schoolType]);

  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    active: 0,
    admitted: 0,
    graduated: 0,
    inactive: 0,
    avgCgpa: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [secondaryFilter, setSecondaryFilter] = useState("all");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [nextIdPreview, setNextIdPreview] = useState<string>("");
  const [manualIdOverride, setManualIdOverride] = useState<boolean>(false);

  const [currentYear, setCurrentYear] = useState(2026);
  const [todayIso, setTodayIso] = useState("2026-10-31");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setTodayIso(new Date().toISOString().split("T")[0]);
  }, []);

  const [formData, setFormData] = useState<StudentFormState>({
    full_name: "",
    email: "",
    phone: "",
    gender: "other",
    student_number: "",
    programme_id: "",
    department_id: "",
    intake_id: "",
    entry_term_id: "",
    cohort_year: currentYear,
    current_level: 100,
    status: "active",
    admission_date: todayIso,
    gpa: "0.00",
    cgpa: "0.00",
    password: "",
    level_label: "100",
    entry_mode: "Regular",
    residential_status: "On-Campus Hostel",
    hostel_name: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    stream_track: "General Science",
    boarding_status: "Day",
    house_dormitory: "",
    guardian_name: "",
    guardian_relationship: "Parent",
    guardian_phone: "",
    guardian_email: "",
    create_parent_record: true,
    create_parent_portal_account: false,
    parent_password: "",
    training_stage: "NVTI Foundation",
    sponsorship_type: "Self-Sponsored",
    next_of_kin_name: "",
    next_of_kin_phone: "",
  });

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load student records.");
        return;
      }

      if (data.school_type) {
        setSchoolType(toPortalSchoolType(data.school_type));
      }
      if (data.next_student_id_preview) {
        setNextIdPreview(String(data.next_student_id_preview));
      }
      setStudents(data.students || []);
      setProgrammes(data.programmes || []);
      setDepartments(data.departments || []);
      setTerms(data.terms || []);
      setIntakes(data.intakes || []);
      setHostels(data.hostels || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error loading student records.");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const deptNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return map;
  }, [departments]);

  const intakeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of intakes) map.set(i.id, `${i.name}${i.code ? ` (${i.code})` : ""}`);
    return map;
  }, [intakes]);

  const openCreateModal = () => {
    const defaultProg = programmes[0]?.id || "";
    const defaultDept = departments[0]?.id || "";
    const defaultIntake = intakes[0]?.id || "";
    const activeTerm = terms.find((t) => t.is_active)?.id || terms[0]?.id || "";
    setEditingStudent(null);
    setManualIdOverride(false);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      gender: "other",
      student_number:
        nextIdPreview ||
        generateNextStudentNumber(students, currentYear, formSpec.idPrefix),
      programme_id: formSpec.showProgram ? defaultProg : "",
      department_id: formSpec.showDepartment ? defaultDept : "",
      intake_id: defaultIntake,
      entry_term_id: activeTerm,
      cohort_year: currentYear,
      current_level: 100,
      status: "active",
      admission_date: todayIso,
      gpa: "0.00",
      cgpa: "0.00",
      password: "",
      level_label: formSpec.levelOptions[0]?.value || "100",
      entry_mode: formSpec.entryModeOptions[0] || "Regular",
      residential_status: formSpec.residentialOptions[0] || "On-Campus Hostel",
      hostel_name: hostels[0]?.name || "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      stream_track: formSpec.streamOptions[0] || "General Science",
      boarding_status: formSpec.boardingOptions[0] || "Boarding",
      house_dormitory: "",
      guardian_name: "",
      guardian_relationship: formSpec.guardianRelationships[0] || "Mother",
      guardian_phone: "",
      guardian_email: "",
      create_parent_record: true,
      create_parent_portal_account: false,
      parent_password: "",
      training_stage: formSpec.trainingStageOptions[0] || "NVTI Foundation",
      sponsorship_type: formSpec.sponsorshipOptions[0] || "Self-Sponsored",
      next_of_kin_name: "",
      next_of_kin_phone: "",
    });
    setModalMode("create");
  };

  const openEditModal = (student: StudentRecord) => {
    const meta = student.metadata && typeof student.metadata === "object" ? student.metadata : {};
    setEditingStudent(student);
    setManualIdOverride(true);
    setFormData({
      full_name: student.full_name,
      email: student.email,
      phone: student.phone || "",
      gender: student.gender || meta.gender || "other",
      student_number: student.student_number,
      programme_id: student.programme_id || "",
      department_id: student.department_id || meta.department_id || "",
      intake_id: student.intake_id || meta.intake_id || "",
      entry_term_id: student.entry_term_id || "",
      cohort_year: student.cohort_year,
      current_level: student.current_level,
      status: student.status,
      admission_date: student.admission_date || todayIso,
      gpa: student.gpa.toFixed(2),
      cgpa: student.cgpa.toFixed(2),
      password: "",
      level_label:
        meta.level_label ||
        (student.current_level >= 500 ? "postgrad" : String(student.current_level || 100)),
      entry_mode: meta.entry_mode || "Regular",
      residential_status: meta.residential_status || "On-Campus Hostel",
      hostel_name: meta.hostel_name || "",
      emergency_contact_name: meta.emergency_contact_name || "",
      emergency_contact_phone: meta.emergency_contact_phone || "",
      stream_track: meta.stream_track || "General Science",
      boarding_status: meta.boarding_status || "Day",
      house_dormitory: meta.house_dormitory || "",
      guardian_name: meta.guardian_name || "",
      guardian_relationship: meta.guardian_relationship || "Parent",
      guardian_phone: meta.guardian_phone || "",
      guardian_email: meta.guardian_email || "",
      create_parent_record: Boolean(meta.guardian_name),
      create_parent_portal_account: false,
      parent_password: "",
      training_stage: meta.training_stage || "NVTI Foundation",
      sponsorship_type: meta.sponsorship_type || "Self-Sponsored",
      next_of_kin_name: meta.next_of_kin_name || "",
      next_of_kin_phone: meta.next_of_kin_phone || "",
    });
    setModalMode("edit");
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (schoolType === "vocational" && !formData.department_id) {
      showNotification(
        "error",
        `Please select a ${formSpec.departmentLabel.toLowerCase()} before saving the trainee record.`
      );
      return;
    }
    if (schoolType !== "vocational" && !formData.programme_id) {
      showNotification(
        "error",
        `Please select a ${formSpec.programLabel.toLowerCase()} before saving the student record.`
      );
      return;
    }

    const levelSpec = formSpec.levelOptions.find((l) => l.value === formData.level_label);
    const numericLevel = levelSpec ? levelSpec.numeric : Number(formData.current_level) || 100;

    // Build school_type-specific metadata JSONB cleanly
    const cleanGender = formData.gender || "other";
    let metadataPayload: Record<string, any> = {};
    if (schoolType === "university") {
      metadataPayload = {
        school_type: "university",
        gender: cleanGender,
        department_id: formData.department_id || null,
        department_name: formData.department_id ? deptNameById.get(formData.department_id) || "" : "",
        level_label: formData.level_label,
        entry_mode: formData.entry_mode,
        residential_status: formData.residential_status,
        hostel_name: formData.hostel_name.trim(),
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
      };
    } else if (schoolType === "high_school") {
      const selectedProg = formData.programme_id
        ? programmes.find((p) => p.id === formData.programme_id)
        : null;
      metadataPayload = {
        school_type: "high_school",
        gender: cleanGender,
        programme_id: formData.programme_id || null,
        class_name: selectedProg?.name || "",
        stream_track: formData.stream_track,
        boarding_status: formData.boarding_status,
        house_dormitory: formData.house_dormitory.trim(),
        guardian_name: formData.guardian_name.trim(),
        guardian_relationship: formData.guardian_relationship,
        guardian_phone: formData.guardian_phone.trim(),
        guardian_email: formData.guardian_email.trim().toLowerCase(),
      };
    } else {
      metadataPayload = {
        school_type: "vocational",
        gender: cleanGender,
        department_id: formData.department_id || null,
        department_name: formData.department_id ? deptNameById.get(formData.department_id) || "" : "",
        intake_id: formData.intake_id || null,
        intake_name: formData.intake_id ? intakeNameById.get(formData.intake_id) || "" : "",
        training_stage: formData.training_stage,
        sponsorship_type: formData.sponsorship_type,
        next_of_kin_name: formData.next_of_kin_name.trim(),
        next_of_kin_phone: formData.next_of_kin_phone.trim(),
      };
    }

    setSaving(true);
    try {
      const isEdit = modalMode === "edit" && editingStudent;
      const res = await fetch("/api/admin/students", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingStudent.id } : {}),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          gender: cleanGender,
          auto_generate_id: !isEdit && !manualIdOverride,
          student_number:
            !isEdit && !manualIdOverride ? "" : formData.student_number,
          programme_id: schoolType === "vocational" ? null : formData.programme_id || null,
          department_id: schoolType === "high_school" ? null : formData.department_id || null,
          intake_id: schoolType === "vocational" ? formData.intake_id || null : null,
          entry_term_id: formData.entry_term_id || null,
          cohort_year: Number(formData.cohort_year),
          current_level: numericLevel,
          status: formData.status,
          admission_date: formData.admission_date,
          gpa: formSpec.showGpaFields ? parseFloat(formData.gpa) || 0 : 0,
          cgpa: formSpec.showGpaFields ? parseFloat(formData.cgpa) || 0 : 0,
          password: formData.password,
          metadata: metadataPayload,
          create_parent_record:
            schoolType === "high_school" &&
            formData.create_parent_record &&
            Boolean(formData.guardian_name.trim()),
          create_parent_portal_account:
            schoolType === "high_school" &&
            formData.create_parent_record &&
            formData.create_parent_portal_account &&
            Boolean(formData.guardian_email.trim()),
          parent_password: formData.parent_password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Unable to save record.");
        return;
      }

      if (data.parent_warning) {
        showNotification(
          "error",
          `${portalConfig.learnerSingular} saved, but parent link reported: ${data.parent_warning}`
        );
      } else {
        const parentSuffix = data.linked_existing_parent
          ? " Linked to existing sibling parent in Parents Directory."
          : data.parent_guardian
          ? " Parent/Guardian saved to Parents Directory."
          : "";
        const assignedStudentNumber =
          data.student?.student_number || formData.student_number;
        showNotification(
          "success",
          (isEdit
            ? `${portalConfig.learnerSingular} "${formData.full_name}" (${assignedStudentNumber}) updated successfully.`
            : `${portalConfig.learnerSingular} "${formData.full_name}" (${assignedStudentNumber}) registered successfully.`) +
            parentSuffix
        );
      }
      setModalMode(null);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving record.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/students?id=${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete student record.");
        return;
      }

      showNotification(
        "success",
        `${portalConfig.learnerSingular} "${deleteTarget.full_name}" (${deleteTarget.student_number}) deleted.`
      );
      setDeleteTarget(null);
      await fetchStudents();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while deleting record.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const meta = s.metadata || {};
      const matchesSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.student_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q) ||
        (s.programme_name || "").toLowerCase().includes(q) ||
        (s.department_name || "").toLowerCase().includes(q) ||
        String(meta.guardian_name || "").toLowerCase().includes(q) ||
        String(meta.stream_track || "").toLowerCase().includes(q) ||
        String(meta.training_stage || "").toLowerCase().includes(q);

      const matchesPrimary =
        programmeFilter === "all" ||
        (schoolType === "vocational"
          ? s.department_id === programmeFilter || meta.department_id === programmeFilter
          : s.programme_id === programmeFilter);

      let matchesSecondary = true;
      if (secondaryFilter !== "all") {
        if (schoolType === "university") {
          matchesSecondary = String(s.current_level) === secondaryFilter;
        } else if (schoolType === "high_school") {
          matchesSecondary = String(meta.boarding_status || "") === secondaryFilter;
        } else {
          matchesSecondary = String(meta.sponsorship_type || "") === secondaryFilter;
        }
      }

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesPrimary && matchesSecondary && matchesStatus;
    });
  }, [students, searchQuery, programmeFilter, secondaryFilter, statusFilter, schoolType]);

  const fourthKpi = useMemo(() => {
    if (schoolType === "high_school") {
      const boarding = students.filter(
        (s) => String(s.metadata?.boarding_status || "").toLowerCase() === "boarding"
      ).length;
      return {
        label: "Boarding Students",
        value: boarding,
        sub: `${students.length - boarding} Day scholars`,
      };
    }
    if (schoolType === "vocational") {
      const sponsored = students.filter(
        (s) =>
          s.metadata?.sponsorship_type &&
          s.metadata.sponsorship_type !== "Self-Sponsored"
      ).length;
      return {
        label: "Sponsored / Grant",
        value: sponsored,
        sub: `${students.length - sponsored} self-sponsored`,
      };
    }
    return {
      label: "Average CGPA",
      value: stats.avgCgpa.toFixed(2),
      sub: "4.00 cumulative scale",
    };
  }, [schoolType, students, stats.avgCgpa]);

  const exportCSV = () => {
    let headers = "";
    let rows = "";
    if (schoolType === "high_school") {
      headers =
        "Admission ID,Full Name,Email,Phone,Class/Form,Stream,Boarding/Day,House,Guardian Name,Guardian Phone,Status\n";
      rows = filteredStudents
        .map((s) => {
          const m = s.metadata || {};
          return `"${s.student_number}","${s.full_name.replace(/"/g, '""')}","${s.email}","${s.phone}","${s.programme_name.replace(/"/g, '""')}","${m.stream_track || ""}","${m.boarding_status || ""}","${m.house_dormitory || ""}","${m.guardian_name || ""}","${m.guardian_phone || ""}","${s.status}"`;
        })
        .join("\n");
    } else if (schoolType === "vocational") {
      headers =
        "Trainee ID,Full Name,Email,Phone,Trade Class,Intake Cohort,NVTI Stage,Sponsorship,Next of Kin,Status\n";
      rows = filteredStudents
        .map((s) => {
          const m = s.metadata || {};
          return `"${s.student_number}","${s.full_name.replace(/"/g, '""')}","${s.email}","${s.phone}","${(s.department_name || s.programme_name).replace(/"/g, '""')}","${m.intake_name || ""}","${m.training_stage || ""}","${m.sponsorship_type || ""}","${m.next_of_kin_phone || ""}","${s.status}"`;
        })
        .join("\n");
    } else {
      headers =
        "Matric Number,Full Name,Email,Phone,Department,Program,Level,Entry Mode,Residential,CGPA,Status\n";
      rows = filteredStudents
        .map((s) => {
          const m = s.metadata || {};
          return `"${s.student_number}","${s.full_name.replace(/"/g, '""')}","${s.email}","${s.phone}","${m.department_name || ""}","${s.programme_name.replace(/"/g, '""')}",${s.current_level},"${m.entry_mode || "Regular"}","${m.residential_status || ""}",${s.cgpa.toFixed(2)},"${s.status}"`;
        })
        .join("\n");
    }
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${portalConfig.learnerPlural.toLowerCase().replace(/\s+/g, "_")}_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <Link href="/admin/dashboard" className="text-[#3B82F6] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">
              {portalConfig.learnerPlural} Directory
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
              {schoolType === "vocational"
                ? "Vocational Trainees Directory"
                : schoolType === "high_school"
                ? "High School Student Records"
                : "University Student Records"}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${portalConfig.badgeClasses}`}
            >
              {portalConfig.portalBadge}
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            {schoolType === "vocational"
              ? "Manage trainee accounts, trade workshop assignments, NVTI training stages, cohorts, and sponsorships."
              : schoolType === "high_school"
              ? "Manage student admissions, class/form placements, streams, boarding houses, and linked parent contacts."
              : "Manage university matriculation records, faculties/programs, academic levels, and campus residency."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredStudents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-50 text-xs font-semibold text-[#475569] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{formSpec.addTitle}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Total {portalConfig.learnerPlural}
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Registered in database</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active & Admitted
            </p>
            <p className="text-2xl font-bold text-[#059669] mt-1">
              {stats.active + stats.admitted}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.active} active · {stats.admitted} newly admitted
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Graduated / Completed
            </p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.graduated}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.inactive} deferred / inactive
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              {fourthKpi.label}
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{fourthKpi.value}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">{fourthKpi.sub}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
            notification.type === "success"
              ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by ${formSpec.idLabel.toLowerCase()}, name, email, or placement...`}
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <Filter className="h-3.5 w-3.5 text-[#94A3B8]" />
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {schoolType === "vocational" ? (
                <>
                  <option value="all">All Trade Classes</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="all">
                    {schoolType === "high_school" ? "All Classes / Forms" : "All Programs"}
                  </option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={secondaryFilter}
              onChange={(e) => setSecondaryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {schoolType === "high_school" ? (
                <>
                  <option value="all">Boarding & Day</option>
                  {formSpec.boardingOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </>
              ) : schoolType === "vocational" ? (
                <>
                  <option value="all">All Sponsorships</option>
                  {formSpec.sponsorshipOptions.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="all">All Levels</option>
                  {formSpec.levelOptions.map((lvl) => (
                    <option key={lvl.value} value={String(lvl.numeric)}>
                      {lvl.label}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {STUDENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchStudents}
            title="Refresh"
            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Students / Trainees Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">{portalConfig.learnerSingular}</th>
                <th className="py-3 px-4">{formSpec.idLabel}</th>
                <th className="py-3 px-4">
                  {schoolType === "vocational"
                    ? "Trade Class & Cohort"
                    : schoolType === "high_school"
                    ? "Class & Stream"
                    : "Department & Program"}
                </th>
                <th className="py-3 px-4">
                  {schoolType === "vocational"
                    ? "NVTI Stage & Sponsor"
                    : schoolType === "high_school"
                    ? "Boarding & House"
                    : "Level & Entry Mode"}
                </th>
                <th className="py-3 px-4">
                  {schoolType === "vocational"
                    ? "Next of Kin"
                    : schoolType === "high_school"
                    ? "Parent / Guardian"
                    : "Residential / CGPA"}
                </th>
                <th className="py-3 px-4">Admission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#3B82F6]" />
                      <span>Loading live records from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const meta = s.metadata || {};
                  const initials = s.full_name
                    ? s.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "ST";

                  return (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#1E293B]">{s.full_name}</div>
                            <div className="text-[11px] text-[#64748B]">{s.email}</div>
                            {s.phone && (
                              <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{s.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">
                        {s.student_number}
                      </td>

                      {/* Placement column */}
                      <td className="py-3.5 px-4">
                        {schoolType === "vocational" ? (
                          <>
                            <div className="font-medium text-[#1E293B]">
                              {s.department_name || s.programme_name || "Unassigned Trade"}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {meta.intake_name ||
                                (s.intake_id ? intakeNameById.get(s.intake_id) : "") ||
                                `Cohort ${s.cohort_year}`}
                            </div>
                          </>
                        ) : schoolType === "high_school" ? (
                          <>
                            <div className="font-medium text-[#1E293B]">
                              {s.programme_name || "Unassigned Class"}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {meta.stream_track || "Core Track"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-[#1E293B]">
                              {s.programme_name || "Unassigned Program"}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {meta.department_name ||
                                (s.department_id ? deptNameById.get(s.department_id) : "") ||
                                s.programme_code ||
                                "General"}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Mode / Boarding / NVTI column */}
                      <td className="py-3.5 px-4">
                        {schoolType === "vocational" ? (
                          <>
                            <div className="font-semibold text-[#334155]">
                              {meta.training_stage || "NVTI Foundation"}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {meta.sponsorship_type || "Self-Sponsored"}
                            </div>
                          </>
                        ) : schoolType === "high_school" ? (
                          <>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                meta.boarding_status === "Boarding"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {meta.boarding_status || "Day"}
                            </span>
                            {meta.house_dormitory && (
                              <div className="text-[11px] text-[#64748B] mt-0.5">
                                {meta.house_dormitory}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-[#334155]">
                              {meta.level_label === "postgrad"
                                ? "Postgraduate"
                                : `Level ${s.current_level}`}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {meta.entry_mode || "Regular"} · Cohort {s.cohort_year}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Residential / Parent / Next of kin column */}
                      <td className="py-3.5 px-4">
                        {schoolType === "vocational" ? (
                          <>
                            <div className="font-medium text-[#1E293B]">
                              {meta.next_of_kin_name || "—"}
                            </div>
                            {meta.next_of_kin_phone && (
                              <div className="text-[11px] text-[#64748B]">
                                {meta.next_of_kin_phone}
                              </div>
                            )}
                          </>
                        ) : schoolType === "high_school" ? (
                          <>
                            <div className="font-medium text-[#1E293B]">
                              {meta.guardian_name || "Not linked"}
                            </div>
                            {(meta.guardian_relationship || meta.guardian_phone) && (
                              <div className="text-[11px] text-[#64748B]">
                                {[meta.guardian_relationship, meta.guardian_phone]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="text-[#334155] font-medium">
                              {meta.residential_status || "On-Campus"}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B]">
                              CGPA {s.cgpa.toFixed(2)}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B]">{s.admission_date}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle(
                            s.status
                          )}`}
                        >
                          {s.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-red-50 text-[#64748B] hover:text-red-600 border border-[#E2E8F0] hover:border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#94A3B8]">
                    {students.length === 0
                      ? `No ${portalConfig.learnerPlural.toLowerCase()} registered yet. Click "${formSpec.addTitle}" above.`
                      : "No records match your active search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {modalMode === "edit"
                    ? `${formSpec.editTitlePrefix} — ${editingStudent?.student_number}`
                    : formSpec.addTitle}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {modalMode === "edit" ? formSpec.editSubtitle : formSpec.addSubtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setEditingStudent(null);
                }}
                className="text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto">
              {/* Row 1: Full Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formSpec.namePlaceholder}
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-bold text-[#334155]">
                      {formSpec.idLabel}{" "}
                      {manualIdOverride || modalMode === "edit" ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-blue-600">
                          (Auto)
                        </span>
                      )}
                    </label>
                    {modalMode === "create" && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualIdOverride((prev) => {
                            const next = !prev;
                            if (!next) {
                              setFormData((f) => ({
                                ...f,
                                student_number:
                                  nextIdPreview ||
                                  generateNextStudentNumber(
                                    students,
                                    currentYear,
                                    formSpec.idPrefix
                                  ),
                              }));
                            }
                            return next;
                          });
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        {manualIdOverride ? "Use auto-ID" : "Manual override"}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required={modalMode === "edit" || manualIdOverride}
                    readOnly={modalMode === "create" && !manualIdOverride}
                    placeholder={nextIdPreview || formSpec.idPlaceholder}
                    value={
                      modalMode === "create" && !manualIdOverride
                        ? nextIdPreview || formData.student_number
                        : formData.student_number
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        student_number: e.target.value.toUpperCase(),
                      })
                    }
                    className={`w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B] focus:outline-none focus:border-[#3B82F6] ${
                      modalMode === "create" && !manualIdOverride
                        ? "bg-slate-100/80 text-slate-600 cursor-default"
                        : "bg-[#F8FAFC] focus:bg-white"
                    }`}
                  />
                  {modalMode === "create" && !manualIdOverride && nextIdPreview && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Preview: <span className="font-mono font-semibold text-slate-700">{nextIdPreview}</span> (assigned atomically on save)
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Email, Phone & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={formSpec.emailPlaceholder}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* SCHOOL-TYPE SPECIFIC SECTION */}
              {schoolType === "university" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        {formSpec.departmentLabel}
                      </label>
                      <select
                        value={formData.department_id}
                        onChange={(e) =>
                          setFormData({ ...formData, department_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                      >
                        <option value="">Select faculty / department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        {formSpec.programLabel} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.programme_id}
                        onChange={(e) =>
                          setFormData({ ...formData, programme_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                      >
                        <option value="">Select program...</option>
                        {programmes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        {formSpec.levelLabel}
                      </label>
                      <select
                        value={formData.level_label}
                        onChange={(e) => {
                          const opt = formSpec.levelOptions.find(
                            (l) => l.value === e.target.value
                          );
                          setFormData({
                            ...formData,
                            level_label: e.target.value,
                            current_level: opt ? opt.numeric : 100,
                          });
                        }}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.levelOptions.map((lvl) => (
                          <option key={lvl.value} value={lvl.value}>
                            {lvl.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Entry Mode
                      </label>
                      <select
                        value={formData.entry_mode}
                        onChange={(e) =>
                          setFormData({ ...formData, entry_mode: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.entryModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Semester / Session
                      </label>
                      <select
                        value={formData.entry_term_id}
                        onChange={(e) =>
                          setFormData({ ...formData, entry_term_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        <option value="">Default active semester</option>
                        {terms.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Hostel / Residential Status
                      </label>
                      <select
                        value={formData.residential_status}
                        onChange={(e) =>
                          setFormData({ ...formData, residential_status: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.residentialOptions.map((resOpt) => (
                          <option key={resOpt} value={resOpt}>
                            {resOpt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Samuel Mensah"
                        value={formData.emergency_contact_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergency_contact_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="+233 ..."
                        value={formData.emergency_contact_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergency_contact_phone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      />
                    </div>
                  </div>
                </>
              )}

              {schoolType === "high_school" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Class / Form <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.programme_id}
                        onChange={(e) =>
                          setFormData({ ...formData, programme_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        <option value="">Select class / form...</option>
                        {programmes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Stream / Track
                      </label>
                      <select
                        value={formData.stream_track}
                        onChange={(e) =>
                          setFormData({ ...formData, stream_track: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.streamOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Boarding vs. Day Status
                      </label>
                      <select
                        value={formData.boarding_status}
                        onChange={(e) =>
                          setFormData({ ...formData, boarding_status: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.boardingOptions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        House / Dormitory
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Unity House / Dormitory 2"
                        value={formData.house_dormitory}
                        onChange={(e) =>
                          setFormData({ ...formData, house_dormitory: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      />
                    </div>
                  </div>

                  {/* High School Parent / Guardian Linking */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        Parent / Guardian Details
                      </span>
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.create_parent_record}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              create_parent_record: e.target.checked,
                            })
                          }
                          className="rounded border-emerald-400 text-emerald-600"
                        />
                        Save to Parents Directory
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                          Parent / Guardian Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Mrs. Grace Osei"
                          value={formData.guardian_name}
                          onChange={(e) =>
                            setFormData({ ...formData, guardian_name: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                          Relationship
                        </label>
                        <select
                          value={formData.guardian_relationship}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_relationship: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                        >
                          {formSpec.guardianRelationships.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                          Parent / Guardian Phone
                        </label>
                        <input
                          type="tel"
                          placeholder="+233 24 ..."
                          value={formData.guardian_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, guardian_phone: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                          Parent Email (for Parent Portal)
                        </label>
                        <input
                          type="email"
                          placeholder="parent@example.com"
                          value={formData.guardian_email}
                          onChange={(e) =>
                            setFormData({ ...formData, guardian_email: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {formData.create_parent_record && formData.guardian_email.trim() && (
                      <div className="pt-2 border-t border-emerald-200/70 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.create_parent_portal_account}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                create_parent_portal_account: e.target.checked,
                              })
                            }
                            className="rounded border-emerald-400 text-emerald-600"
                          />
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Provision Parent Portal Login Account via Server Action
                        </label>
                        {formData.create_parent_portal_account && (
                          <input
                            type="password"
                            minLength={6}
                            placeholder="Initial Parent Portal password (min 6 chars, auto-generated if blank)"
                            value={formData.parent_password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                parent_password: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {schoolType === "vocational" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        {formSpec.departmentLabel} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.department_id}
                        onChange={(e) =>
                          setFormData({ ...formData, department_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        <option value="">Select trade class / workshop...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Intake / Cohort
                      </label>
                      <select
                        value={formData.intake_id}
                        onChange={(e) =>
                          setFormData({ ...formData, intake_id: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        <option value="">Select intake cohort...</option>
                        {intakes.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Training Level / NVTI Stage
                      </label>
                      <select
                        value={formData.training_stage}
                        onChange={(e) =>
                          setFormData({ ...formData, training_stage: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.trainingStageOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Sponsorship Type
                      </label>
                      <select
                        value={formData.sponsorship_type}
                        onChange={(e) =>
                          setFormData({ ...formData, sponsorship_type: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      >
                        {formSpec.sponsorshipOptions.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Next of Kin / Guardian Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Kwaku Boateng"
                        value={formData.next_of_kin_name}
                        onChange={(e) =>
                          setFormData({ ...formData, next_of_kin_name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Next of Kin / Guardian Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="+233 ..."
                        value={formData.next_of_kin_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, next_of_kin_phone: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Common Lifecycle & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    {formSpec.admissionDateLabel}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admission_date}
                    onChange={(e) =>
                      setFormData({ ...formData, admission_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Cohort Year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    required
                    value={formData.cohort_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cohort_year: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Enrolment Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {STUDENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* University-only GPA fields */}
              {formSpec.showGpaFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Term GPA (0.00 - 4.00)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.gpa}
                      onChange={(e) =>
                        setFormData({ ...formData, gpa: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Cumulative CGPA (0.00 - 4.00)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.cgpa}
                      onChange={(e) =>
                        setFormData({ ...formData, cgpa: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  {modalMode === "edit"
                    ? "Reset Portal Password (Optional)"
                    : "Initial Portal Password (Optional)"}
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder={
                    modalMode === "edit"
                      ? "Leave blank to keep existing password (min. 8 characters)"
                      : "Min. 8 characters (auto-generated if left blank)"
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode(null);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {saving
                      ? "Saving..."
                      : modalMode === "edit"
                      ? "Save Changes"
                      : formSpec.addTitle}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Delete {portalConfig.learnerSingular} Record
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-[#1E293B]">
                      {deleteTarget.full_name}
                    </span>{" "}
                    (<span className="font-mono">{deleteTarget.student_number}</span>)?
                    This removes their record, enrolments, and linked portal login account.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{deleting ? "Deleting..." : "Delete Permanently"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
