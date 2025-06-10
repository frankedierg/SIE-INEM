const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const Performance = require('../models/Performance');
const Remediation = require('../models/Remediation');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Informe individual de estudiante
// GET /api/reports/student/:studentId?period=2025-1[&format=csv|xlsx]
router.get('/student/:studentId', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { period, format } = req.query;
    const studentId = req.params.studentId;
    // Notas del estudiante en el periodo
    const grades = await Grade.find({ studentId, semester: period })
      .populate('subjectId', 'name type');
    // Desempeños del estudiante en el periodo
    const performances = await Performance.find({ studentId, semester: period })
      .populate('subjectId', 'name type');
    // Habilitaciones del estudiante en el periodo
    const remediations = await Remediation.find({ studentId, period })
      .populate('subjectId', 'name type');
    // Cálculo de promedios y resumen
    let sum = 0, count = 0;
    grades.forEach(g => {
      if (typeof g.finalGrade === 'number') {
        sum += g.finalGrade;
        count++;
      }
    });
    const promedio = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;

    // Exportación a CSV/XLSX
    if (format === 'csv' || format === 'xlsx') {
      const xlsx = require('xlsx');
      // Hoja de notas
      const gradesSheet = grades.map(g => ({
        Asignatura: g.subjectId.name,
        Tipo: g.subjectId.type,
        Corte1: g.cut1,
        Corte2: g.cut2,
        ExamenFinal: g.finalExam,
        NotaFinal: g.finalGrade
      }));
      // Hoja de desempeños
      const perfSheet = performances.map(p => ({
        Asignatura: p.subjectId.name,
        Tipo: p.subjectId.type,
        Nivel: p.level,
        Descripción: p.description,
        Recomendaciones: p.recommendations
      }));
      // Hoja de habilitaciones
      const remSheet = remediations.map(r => ({
        Asignatura: r.subjectId.name,
        Tipo: r.subjectId.type,
        TipoHabilitacion: r.type,
        NotaAntes: r.gradeBefore,
        NotaHabilitacion: r.remediationGrade,
        Aprobado: r.approved
      }));
      // Crear libro
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(gradesSheet), 'Notas');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(perfSheet), 'Desempeños');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(remSheet), 'Habilitaciones');
      // Resumen
      const resumenSheet = [
        { Periodo: period, Promedio: promedio }
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(resumenSheet), 'Resumen');
      // Exportar
      if (format === 'csv') {
        // Solo exportar la hoja de notas como CSV
        const csv = xlsx.utils.sheet_to_csv(xlsx.utils.json_to_sheet(gradesSheet));
        res.header('Content-Type', 'text/csv');
        res.attachment(`informe_estudiante_${studentId}_${period}.csv`);
        return res.send(csv);
      } else {
        // XLSX completo
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`informe_estudiante_${studentId}_${period}.xlsx`);
        return res.send(buffer);
      }
    }

    // Respuesta JSON por defecto
    res.json({
      studentId,
      period,
      promedio,
      grades,
      performances,
      remediations
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Informe por grupo
// GET /api/reports/group/:groupId?period=2025-1[&format=csv|xlsx]
router.get('/group/:groupId', auth, authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { period, format } = req.query;
    const groupId = req.params.groupId;
    const Group = require('../models/Group');
    const group = await Group.findById(groupId).populate('students', 'name email');
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    // Obtener IDs de estudiantes
    const studentIds = group.students.map(s => s._id);
    // Notas de todos los estudiantes del grupo en el periodo
    const grades = await Grade.find({ studentId: { $in: studentIds }, semester: period }).populate('subjectId', 'name type');
    // Calcular promedios individuales y general
    const promedios = {};
    let sumaGeneral = 0, totalEstudiantes = 0;
    studentIds.forEach(id => {
      const studentGrades = grades.filter(g => g.studentId.toString() === id.toString());
      let sum = 0, count = 0;
      studentGrades.forEach(g => {
        if (typeof g.finalGrade === 'number') {
          sum += g.finalGrade;
          count++;
        }
      });
      promedios[id] = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
      if (count > 0) {
        sumaGeneral += sum / count;
        totalEstudiantes++;
      }
    });
    const promedioGrupo = totalEstudiantes > 0 ? parseFloat((sumaGeneral / totalEstudiantes).toFixed(2)) : null;
    // Distribución de aprobados/reprobados y niveles de desempeño por materia
    const materias = {};
    grades.forEach(g => {
      const subjId = g.subjectId._id;
      if (!materias[subjId]) {
        materias[subjId] = {
          name: g.subjectId.name,
          type: g.subjectId.type,
          total: 0,
          aprobados: 0,
          reprobados: 0,
          niveles: { bajo: 0, basico: 0, alto: 0, superior: 0 }
        };
      }
      materias[subjId].total++;
      // Aprobación según tipo
      let aprobado = false;
      if (g.subjectId.type === 'core') {
        aprobado = g.finalGrade >= 3.0;
      } else if (g.subjectId.type === 'modality') {
        aprobado = g.finalGrade >= 3.5;
      }
      if (aprobado) materias[subjId].aprobados++;
      else materias[subjId].reprobados++;
      // Nivel de desempeño
      let nivel = 'bajo';
      if (g.subjectId.type === 'core') {
        if (g.finalGrade >= 4.5) nivel = 'superior';
        else if (g.finalGrade >= 4.0) nivel = 'alto';
        else if (g.finalGrade >= 3.0) nivel = 'basico';
      } else if (g.subjectId.type === 'modality') {
        if (g.finalGrade >= 4.5) nivel = 'superior';
        else if (g.finalGrade >= 4.0) nivel = 'alto';
        else if (g.finalGrade >= 3.5) nivel = 'basico';
      }
      materias[subjId].niveles[nivel]++;
    });

    // Exportación a CSV/XLSX
    if (format === 'csv' || format === 'xlsx') {
      const xlsx = require('xlsx');
      // Hoja de notas
      const gradesSheet = grades.map(g => ({
        Estudiante: group.students.find(s => s._id.toString() === g.studentId.toString())?.name,
        Asignatura: g.subjectId.name,
        Tipo: g.subjectId.type,
        Corte1: g.cut1,
        Corte2: g.cut2,
        ExamenFinal: g.finalExam,
        NotaFinal: g.finalGrade
      }));
      // Hoja de promedios individuales
      const promsSheet = Object.entries(promedios).map(([id, prom]) => {
        const estudiante = group.students.find(s => s._id.toString() === id)?.name;
        return { Estudiante: estudiante, Promedio: prom };
      });
      // Hoja de materias
      const materiasSheet = Object.values(materias).map(m => ({
        Asignatura: m.name,
        Tipo: m.type,
        Total: m.total,
        Aprobados: m.aprobados,
        Reprobados: m.reprobados,
        Bajo: m.niveles.bajo,
        Basico: m.niveles.basico,
        Alto: m.niveles.alto,
        Superior: m.niveles.superior
      }));
      // Resumen
      const resumenSheet = [
        { Periodo: period, PromedioGrupo: promedioGrupo }
      ];
      // Crear libro
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(gradesSheet), 'Notas');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(promsSheet), 'Promedios');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(materiasSheet), 'Materias');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(resumenSheet), 'Resumen');
      if (format === 'csv') {
        // Solo exportar la hoja de notas como CSV
        const csv = xlsx.utils.sheet_to_csv(xlsx.utils.json_to_sheet(gradesSheet));
        res.header('Content-Type', 'text/csv');
        res.attachment(`informe_grupo_${groupId}_${period}.csv`);
        return res.send(csv);
      } else {
        // XLSX completo
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`informe_grupo_${groupId}_${period}.xlsx`);
        return res.send(buffer);
      }
    }

    res.json({
      group: { _id: group._id, name: group.name, grade: group.grade },
      period,
      promedioGrupo,
      promediosIndividuales: promedios,
      materias: Object.values(materias)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Informe por asignatura
// GET /api/reports/subject/:subjectId?period=2025-1[&format=csv|xlsx]
router.get('/subject/:subjectId', auth, authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { period, format } = req.query;
    const subjectId = req.params.subjectId;
    const grades = await Grade.find({ subjectId, semester: period }).populate('studentId', 'name email');
    if (!grades.length) {
      return res.status(404).json({ message: 'No hay registros de notas para esta asignatura en el periodo indicado' });
    }
    // Promedio general
    let sum = 0, count = 0;
    grades.forEach(g => {
      if (typeof g.finalGrade === 'number') {
        sum += g.finalGrade;
        count++;
      }
    });
    const promedio = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
    // Distribución de aprobados/reprobados y niveles de desempeño
    let aprobados = 0, reprobados = 0;
    let niveles = { bajo: 0, basico: 0, alto: 0, superior: 0 };
    let subjectType = grades[0].subjectId.type;
    grades.forEach(g => {
      // Aprobación según tipo
      let aprobado = false;
      if (subjectType === 'core') {
        aprobado = g.finalGrade >= 3.0;
      } else if (subjectType === 'modality') {
        aprobado = g.finalGrade >= 3.5;
      }
      if (aprobado) aprobados++;
      else reprobados++;
      // Nivel de desempeño
      let nivel = 'bajo';
      if (subjectType === 'core') {
        if (g.finalGrade >= 4.5) nivel = 'superior';
        else if (g.finalGrade >= 4.0) nivel = 'alto';
        else if (g.finalGrade >= 3.0) nivel = 'basico';
      } else if (subjectType === 'modality') {
        if (g.finalGrade >= 4.5) nivel = 'superior';
        else if (g.finalGrade >= 4.0) nivel = 'alto';
        else if (g.finalGrade >= 3.5) nivel = 'basico';
      }
      niveles[nivel]++;
    });

    // Exportación a CSV/XLSX
    if (format === 'csv' || format === 'xlsx') {
      const xlsx = require('xlsx');
      // Hoja de notas
      const gradesSheet = grades.map(g => ({
        Estudiante: g.studentId.name,
        Asignatura: grades[0].subjectId.name,
        Tipo: subjectType,
        Corte1: g.cut1,
        Corte2: g.cut2,
        ExamenFinal: g.finalExam,
        NotaFinal: g.finalGrade
      }));
      // Hoja de resumen
      const resumenSheet = [
        { Periodo: period, Promedio: promedio, Total: count, Aprobados: aprobados, Reprobados: reprobados, Bajo: niveles.bajo, Basico: niveles.basico, Alto: niveles.alto, Superior: niveles.superior }
      ];
      // Crear libro
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(gradesSheet), 'Notas');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(resumenSheet), 'Resumen');
      if (format === 'csv') {
        const csv = xlsx.utils.sheet_to_csv(xlsx.utils.json_to_sheet(gradesSheet));
        res.header('Content-Type', 'text/csv');
        res.attachment(`informe_asignatura_${subjectId}_${period}.csv`);
        return res.send(csv);
      } else {
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`informe_asignatura_${subjectId}_${period}.xlsx`);
        return res.send(buffer);
      }
    }

    res.json({
      subject: {
        _id: subjectId,
        name: grades[0].subjectId.name,
        type: subjectType
      },
      period,
      promedio,
      total: count,
      aprobados,
      reprobados,
      niveles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reporte de desempeño docente
// GET /api/reports/teacher-performance/:teacherId?period=2025-1[&format=csv|xlsx]
router.get('/teacher-performance/:teacherId', auth, authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { period, format } = req.query;
    const teacherId = req.params.teacherId;
    const Subject = require('../models/Subject');
    const Group = require('../models/Group');
    // Grupos donde el docente es director
    const groups = await Group.find({ directorId: teacherId });
    // Asignaturas que dicta
    const subjects = await Subject.find({ teacherId });
    // Para cada asignatura, obtener grupos asociados (por estudiantes inscritos)
    let subjectReports = [];
    for (const subject of subjects) {
      // Buscar todos los grupos que tengan estudiantes inscritos en esta asignatura
      // (Esto requiere lógica adicional si hay una relación explícita, aquí se asume todos los grupos)
      // Notas de la asignatura en el periodo
      const grades = await Grade.find({ subjectId: subject._id, semester: period }).populate('studentId', 'name');
      // Obtener grupos únicos de los estudiantes
      let groupIds = new Set();
      for (const g of grades) {
        // Buscar grupo por estudiante (solo si hay relación directa)
        // Aquí se asume que cada estudiante pertenece a un solo grupo
        const studentGroups = await Group.find({ students: g.studentId._id });
        studentGroups.forEach(grp => groupIds.add(grp._id.toString()));
      }
      let sum = 0, count = 0, aprobados = 0, reprobados = 0;
      let niveles = { bajo: 0, basico: 0, alto: 0, superior: 0 };
      grades.forEach(g => {
        if (typeof g.finalGrade === 'number') {
          sum += g.finalGrade;
          count++;
          // Aprobación según tipo
          let aprobado = false;
          if (subject.type === 'core') {
            aprobado = g.finalGrade >= 3.0;
          } else if (subject.type === 'modality') {
            aprobado = g.finalGrade >= 3.5;
          }
          if (aprobado) aprobados++;
          else reprobados++;
          // Nivel de desempeño
          let nivel = 'bajo';
          if (subject.type === 'core') {
            if (g.finalGrade >= 4.5) nivel = 'superior';
            else if (g.finalGrade >= 4.0) nivel = 'alto';
            else if (g.finalGrade >= 3.0) nivel = 'basico';
          } else if (subject.type === 'modality') {
            if (g.finalGrade >= 4.5) nivel = 'superior';
            else if (g.finalGrade >= 4.0) nivel = 'alto';
            else if (g.finalGrade >= 3.5) nivel = 'basico';
          }
          niveles[nivel]++;
        }
      });
      subjectReports.push({
        _id: subject._id,
        name: subject.name,
        type: subject.type,
        promedio: count > 0 ? parseFloat((sum / count).toFixed(2)) : null,
        total: count,
        aprobados,
        reprobados,
        niveles,
        grupos: Array.from(groupIds)
      });
    }

    // Exportación a CSV/XLSX
    if (format === 'csv' || format === 'xlsx') {
      const xlsx = require('xlsx');
      // Hoja de asignaturas
      const asignaturasSheet = subjectReports.map(s => ({
        Asignatura: s.name,
        Tipo: s.type,
        Promedio: s.promedio,
        Total: s.total,
        Aprobados: s.aprobados,
        Reprobados: s.reprobados,
        Bajo: s.niveles.bajo,
        Basico: s.niveles.basico,
        Alto: s.niveles.alto,
        Superior: s.niveles.superior,
        Grupos: s.grupos.join(', ')
      }));
      // Hoja de grupos director
      const gruposSheet = groups.map(g => ({
        Grupo: g.name,
        Grado: g.grade
      }));
      // Resumen
      const resumenSheet = [
        { Periodo: period, Docente: teacherId }
      ];
      // Crear libro
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(asignaturasSheet), 'Asignaturas');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(gruposSheet), 'GruposDirector');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(resumenSheet), 'Resumen');
      if (format === 'csv') {
        const csv = xlsx.utils.sheet_to_csv(xlsx.utils.json_to_sheet(asignaturasSheet));
        res.header('Content-Type', 'text/csv');
        res.attachment(`reporte_desempeno_docente_${teacherId}_${period}.csv`);
        return res.send(csv);
      } else {
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`reporte_desempeno_docente_${teacherId}_${period}.xlsx`);
        return res.send(buffer);
      }
    }

    res.json({
      teacherId,
      period,
      gruposDirector: groups.map(g => ({ _id: g._id, name: g.name, grade: g.grade })),
      asignaturas: subjectReports
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Informe de habilitaciones (nivelaciones y recuperaciones)
// GET /api/reports/remediations?period=2025-1&type=recuperacion_semestral[&format=csv|xlsx]
router.get('/remediations', auth, authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { period, type, format } = req.query;
    const Remediation = require('../models/Remediation');
    const Group = require('../models/Group');
    // Filtro base
    let filter = {};
    if (period) filter.period = period;
    if (type) filter.type = type;
    // Buscar habilitaciones
    const remediations = await Remediation.find(filter)
      .populate('studentId', 'name')
      .populate('subjectId', 'name type');
    // Cantidad total
    const total = remediations.length;
    // Por tipo
    const porTipo = remediations.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    // Por asignatura
    const porAsignatura = {};
    remediations.forEach(r => {
      const subj = r.subjectId?.name || 'Desconocida';
      if (!porAsignatura[subj]) porAsignatura[subj] = 0;
      porAsignatura[subj]++;
    });
    // Por grupo (requiere buscar grupo de cada estudiante)
    const porGrupo = {};
    for (const r of remediations) {
      const grupos = await Group.find({ students: r.studentId?._id });
      grupos.forEach(g => {
        if (!porGrupo[g.name]) porGrupo[g.name] = 0;
        porGrupo[g.name]++;
      });
    }

    // Exportación a CSV/XLSX
    if (format === 'csv' || format === 'xlsx') {
      const xlsx = require('xlsx');
      // Hoja de habilitaciones
      const remSheet = remediations.map(r => ({
        Estudiante: r.studentId?.name,
        Asignatura: r.subjectId?.name,
        TipoAsignatura: r.subjectId?.type,
        TipoHabilitacion: r.type,
        Periodo: r.period,
        NotaAntes: r.gradeBefore,
        NotaHabilitacion: r.remediationGrade,
        Aprobado: r.approved
      }));
      // Hoja de resumen
      const resumenSheet = [
        { Total: total, ...porTipo, Periodo: period || '', Tipo: type || '' }
      ];
      // Crear libro
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(remSheet), 'Habilitaciones');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(resumenSheet), 'Resumen');
      if (format === 'csv') {
        const csv = xlsx.utils.sheet_to_csv(xlsx.utils.json_to_sheet(remSheet));
        res.header('Content-Type', 'text/csv');
        res.attachment(`informe_habilitaciones_${period || 'todos'}.csv`);
        return res.send(csv);
      } else {
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`informe_habilitaciones_${period || 'todos'}.xlsx`);
        return res.send(buffer);
      }
    }

    res.json({
      total,
      porTipo,
      porAsignatura,
      porGrupo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
