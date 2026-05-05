import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Trash2, Download, BookOpen, DoorOpen } from 'lucide-react';
import api from '../../../shared/services/api';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableGenerator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const departmentRef = useRef(null);
  const yearRef = useRef(null);
  const sectionRef = useRef(null);

  const [basicDetails, setBasicDetails] = useState({ department: '', year: '', section: '' });
  const [dayConfig, setDayConfig] = useState({ workingDays: [], numPeriods: 6, numLabs: 0 });
  const [timeSlotsByDay, setTimeSlotsByDay] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newSubject, setNewSubject] = useState({ name: '', type: 'THEORY', staffName: '', roomId: '' });
  const [newRoom, setNewRoom] = useState({ name: '', type: 'CLASSROOM', capacity: 60 });
  const [batchId, setBatchId] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [reviewData, setReviewData] = useState({
    basic: { department: '', year: '', section: '' },
    days: [],
    slots: [],
    subjects: [],
    rooms: [],
    workingDays: []
  });

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const handleDayConfigChange = (field, value) => {
    setDayConfig(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'workingDays') {
        setTimeSlotsByDay(prevSlots => {
          const nextSlots = {};
          value.forEach(day => {
            nextSlots[day] = prevSlots[day] || [];
          });
          return nextSlots;
        });
      }
      return next;
    });
  };

  const addTimeSlot = (day) => {
    setTimeSlotsByDay(prev => {
      const current = prev[day] ? [...prev[day]] : [];
      current.push({
        slotNumber: current.length + 1,
        startTime: '12:00',
        endTime: '13:00',
        slotType: 'NORMAL',
        subjectName: '',
        roomName: '',
        staffName: '',
      });
      return { ...prev, [day]: current };
    });
  };

  const removeTimeSlot = (day, index) => {
    setTimeSlotsByDay(prev => {
      const current = prev[day] ? [...prev[day]] : [];
      current.splice(index, 1);
      return { ...prev, [day]: current };
    });
  };

  const handleTimeSlotChange = (day, index, field, value) => {
    setTimeSlotsByDay(prev => {
      const current = prev[day] ? [...prev[day]] : [];
      const nextSlot = { ...current[index], [field]: value };

      if (field === 'slotType' && value !== 'NORMAL') {
        nextSlot.subjectName = '';
        nextSlot.roomName = '';
        nextSlot.staffName = '';
      }

      current[index] = nextSlot;
      return { ...prev, [day]: current };
    });
  };

  const handleTimeSlotSubjectChange = (day, index, subjectName) => {
    const selectedSubject = subjects.find(subject => subject.name === subjectName);
    setTimeSlotsByDay(prev => {
      const current = prev[day] ? [...prev[day]] : [];
      current[index] = {
        ...current[index],
        subjectName,
        roomName: selectedSubject?.roomId || '',
        staffName: selectedSubject?.staffName || '',
      };
      return { ...prev, [day]: current };
    });
  };

  const handleNewSubjectChange = (field, value) => {
    setNewSubject(prev => ({ ...prev, [field]: value }));
  };

  const addSubject = () => {
    if (!newSubject.name || !newSubject.staffName || !newSubject.roomId) return;
    setSubjects(prev => [...prev, { ...newSubject, id: Date.now() }]);
    setNewSubject({ name: '', type: 'THEORY', staffName: '', roomId: '' });
  };

  const removeSubject = (id) => {
    setSubjects(prev => prev.filter(subject => subject.id !== id));
  };

  const handleNewRoomChange = (field, value) => {
    setNewRoom(prev => ({ ...prev, [field]: value }));
  };

  const addRoom = () => {
    if (!newRoom.name) return;
    setRooms(prev => [...prev, { ...newRoom, id: Date.now() }]);
    setNewRoom({ name: '', type: 'CLASSROOM', capacity: 60 });
  };

  const removeRoom = (id) => {
    setRooms(prev => prev.filter(room => room.id !== id));
  };

  const handleCreateBatch = async (payload) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/timetable/batch/create', payload);
      setBatchId(response.data.id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureBatch = async () => {
    try {
      setLoading(true);
      setError(null);

      const dayConfigsData = dayConfig.workingDays.map(day => ({
        day,
        numPeriods: dayConfig.numPeriods,
        numLabs: dayConfig.numLabs,
        isWorkingDay: true,
      }));

      const subjectsData = subjects.map(subject => ({
        name: subject.name,
        subject_type: subject.type,
        staff_name: subject.staffName,
        room_id: subject.roomId,
      }));

      const roomsData = rooms.map(room => ({
        room_name: room.name,
        room_type: room.type,
        capacity: room.capacity,
      }));

      const timeSlotsData = dayConfig.workingDays.map(day => ({
        day,
        slots: (timeSlotsByDay[day] || []).map(slot => ({
          slot_number: slot.slotNumber,
          start_time: slot.startTime,
          end_time: slot.endTime,
          slot_type: slot.slotType,
          subject_name: slot.subjectName,
          room_name: slot.roomName,
          staff_name: slot.staffName,
        })),
      }));

      await api.post(`/timetable/${batchId}/configure`, {
        day_configs: dayConfigsData,
        time_slots: timeSlotsData,
        subjects: subjectsData,
        rooms: roomsData,
      });

      // Set review data with all entered details - this is what will be displayed and used for generation
      setReviewData({
        basic: basicDetails,
        days: dayConfigsData,
        slots: timeSlotsData,
        subjects: subjectsData,
        rooms: roomsData,
        workingDays: dayConfig.workingDays
      });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to configure batch');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/timetable/${batchId}/generate`);
      setTimetableData(response.data);
      setStep(6);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/timetable/${batchId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_${basicDetails.department}_${basicDetails.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download PDF');
    }
  };

  const getEntryRoom = (entry) => {
    if (entry.room_name && !/^[0-9]+$/.test(String(entry.room_name))) {
      return entry.room_name;
    }
    const roomList = entry.entry_type === 'LAB'
      ? rooms.filter(room => room.type === 'LAB')
      : rooms.filter(room => room.type === 'CLASSROOM');
    return roomList[0]?.name || entry.room_name || '–';
  };

  const canProceedToStep2 = Boolean(basicDetails.department && basicDetails.year && basicDetails.section);
  const canProceedToStep3 = dayConfig.workingDays.length > 0;
  const canProceedToStep4 = subjects.length > 0 && rooms.length > 0;
  const canProceedToStep5 = Object.values(timeSlotsByDay).some(slots => slots && slots.length > 0);

  const workingDays = dayConfig.workingDays;
  const orderedWorkingDays = daysOfWeek.filter(day => workingDays.includes(day));
  const subjectOptions = subjects.map(subject => subject.name).filter(Boolean);
  const staffOptions = Array.from(new Set(subjects.map(subject => subject.staffName).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Timetable Generator</h1>
          <p className="text-gray-600">Create and manage academic timetables</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((s, idx) => (
              <React.Fragment key={s}>
                <motion.div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold cursor-pointer transition-all ${step === s ? 'bg-indigo-600 text-white scale-110' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => step > s && setStep(s)}
                >
                  {step > s ? '✓' : s}
                </motion.div>
                {idx < 5 && <div className={`flex-1 h-1 mx-2 transition-colors ${step > s + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-600">
            <span>Details</span>
            <span>Days</span>
            <span>Subjects</span>
            <span>Slots</span>
            <span>Review</span>
            <span>Output</span>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 1: Basic Details</h2>
              <div className="space-y-4">
                <select ref={departmentRef} defaultValue="" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600">
                  <option value="">Select Department</option>
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="EEE">Electrical (EEE)</option>
                  <option value="MECH">Mechanical (MECH)</option>
                  <option value="CIVIL">Civil (CIVIL)</option>
                </select>
                <select ref={yearRef} defaultValue="" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600">
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">Final Year</option>
                </select>
                <input ref={sectionRef} type="text" placeholder="Section (e.g., A, B, C)" defaultValue="" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div className="flex justify-between mt-8">
                <button 
                  onClick={() => navigate(-1)} 
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
                <button
                  onClick={() => {
                    const payload = {
                      department: departmentRef.current?.value || '',
                      year: yearRef.current?.value || '',
                      section: sectionRef.current?.value || '',
                    };

                    if (!payload.department || !payload.year || !payload.section) {
                      setError('Please select department, year, and section before continuing.');
                      return;
                    }

                    setBasicDetails(payload);
                    handleCreateBatch(payload);
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  {loading ? 'Creating...' : 'Next'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 2: Day Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Periods Per Day</label>
                  <input type="number" value={dayConfig.numPeriods} onChange={e => handleDayConfigChange('numPeriods', parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labs Per Day</label>
                  <input type="number" value={dayConfig.numLabs} onChange={e => handleDayConfigChange('numLabs', parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map(day => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={dayConfig.workingDays.includes(day)} onChange={e => {
                          if (e.target.checked) handleDayConfigChange('workingDays', [...dayConfig.workingDays, day]);
                          else handleDayConfigChange('workingDays', dayConfig.workingDays.filter(d => d !== day));
                        }} className="w-4 h-4 rounded border-gray-300" />
                        <span className="text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center gap-2"><ChevronLeft size={18} />Back</button>
                <button onClick={() => setStep(3)} disabled={!canProceedToStep3} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2">Next<ChevronRight size={18} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 3: Subjects & Rooms</h2>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2"><DoorOpen size={20} className="text-blue-600" />Rooms</h3>
                <div className="space-y-3 mb-4">
                  {rooms.map(room => (
                    <motion.div key={room.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="font-semibold">{room.name}</span>
                      <span className="text-sm text-gray-600">{room.type} (Cap: {room.capacity})</span>
                      <button onClick={() => removeRoom(room.id)} className="text-red-600 hover:bg-red-100 p-2 rounded"><Trash2 size={18} /></button>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  <input type="text" placeholder="Room Name (e.g., Lab 101)" value={newRoom.name} onChange={e => handleNewRoomChange('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <select value={newRoom.type} onChange={e => handleNewRoomChange('type', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"><option>CLASSROOM</option><option>LAB</option></select>
                    <input type="number" placeholder="Capacity" value={newRoom.capacity} onChange={e => handleNewRoomChange('capacity', parseInt(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <button onClick={addRoom} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18} />Add Room</button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-green-600" />Subjects</h3>
                <div className="space-y-3 mb-4">
                  {subjects.map(subject => (
                    <motion.div key={subject.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex-1"><span className="font-semibold">{subject.name}</span><span className="text-sm text-gray-600 ml-3">({subject.type}) • {subject.staffName}</span></div>
                      <button onClick={() => removeSubject(subject.id)} className="text-red-600 hover:bg-red-100 p-2 rounded"><Trash2 size={18} /></button>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  <input type="text" placeholder="Subject Name" value={newSubject.name} onChange={e => handleNewSubjectChange('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <input type="text" placeholder="Staff Name" value={newSubject.staffName} onChange={e => handleNewSubjectChange('staffName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <select value={newSubject.type} onChange={e => handleNewSubjectChange('type', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"><option>THEORY</option><option>LAB</option></select>
                    <select value={newSubject.roomId} onChange={e => handleNewSubjectChange('roomId', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"><option value="">Select Room</option>{rooms.map(room => (<option key={room.id} value={room.name}>{room.name}</option>))}</select>
                  </div>
                  <button onClick={addSubject} className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"><Plus size={18} />Add Subject</button>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(2)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center gap-2"><ChevronLeft size={18} />Back</button>
                <button onClick={() => setStep(4)} disabled={!canProceedToStep4 || loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2">Next<ChevronRight size={18} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 4 && (
            <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 4: Time Slots</h2>
              <div className="space-y-6 mb-6">
                {orderedWorkingDays.map(day => (
                  <div key={day} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{day}</h4>
                      <button onClick={() => addTimeSlot(day)} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm flex items-center gap-2"><Plus size={14} /> Add Slot</button>
                    </div>

                    <div className="space-y-3">
                      {(timeSlotsByDay[day] || []).map((slot, idx) => (
                        <motion.div key={`${day}-${idx}`} className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-[72px_150px_150px_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,1fr)_44px] gap-3 items-end border border-gray-200 rounded-lg p-4 w-full overflow-x-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <input type="number" value={slot.slotNumber} onChange={e => handleTimeSlotChange(day, idx, 'slotNumber', parseInt(e.target.value))} placeholder="Slot #" className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" />
                          <input type="time" value={slot.startTime} onChange={e => handleTimeSlotChange(day, idx, 'startTime', e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" />
                          <input type="time" value={slot.endTime} onChange={e => handleTimeSlotChange(day, idx, 'endTime', e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg" />
                          <select value={slot.slotType} onChange={e => handleTimeSlotChange(day, idx, 'slotType', e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg"><option>NORMAL</option><option>BREAK</option><option>LUNCH</option></select>
                          {slot.slotType === 'NORMAL' && (
                            <>
                              <select value={slot.subjectName} onChange={e => handleTimeSlotSubjectChange(day, idx, e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">Select Subject</option>
                                {subjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                              </select>
                              <select value={slot.roomName} onChange={e => handleTimeSlotChange(day, idx, 'roomName', e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">Select Classroom</option>
                                {rooms.map(room => <option key={room.id} value={room.name}>{room.name}</option>)}
                              </select>
                              <select value={slot.staffName} onChange={e => handleTimeSlotChange(day, idx, 'staffName', e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">Select Staff</option>
                                {staffOptions.map(staff => <option key={staff} value={staff}>{staff}</option>)}
                              </select>
                            </>
                          )}
                          <button onClick={() => removeTimeSlot(day, idx)} className="justify-self-start p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(3)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center gap-2"><ChevronLeft size={18} />Back</button>
                <button onClick={handleConfigureBatch} disabled={!canProceedToStep5 || loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2">{loading ? 'Saving...' : 'Next'}<ChevronRight size={18} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 5 && (
            <motion.div key="step5" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 5: Review Configuration</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-indigo-600 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Batch Details</h3>
                  <p className="text-gray-600">{reviewData.basic?.department} • Year {reviewData.basic?.year} • Section {reviewData.basic?.section}</p>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Working Days</h3>
                  <p className="text-gray-600">{reviewData.workingDays?.join(', ') || 'No days selected'}</p>
                  <p className="text-sm text-gray-500 mt-1">{reviewData.days?.[0]?.numPeriods || 0} periods, {reviewData.days?.[0]?.numLabs || 0} labs per day</p>
                </div>
                <div className="border-l-4 border-green-600 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Time Slots</h3>
                  <div className="space-y-1 text-sm">
                    {(reviewData.slots || []).map((daySlots) => (
                      <div key={daySlots.day} className="mb-2">
                        <div className="font-medium text-gray-700">{daySlots.day} ({daySlots.slots?.length || 0})</div>
                        <div className="text-gray-600">
                          {(daySlots.slots || []).map((slot, idx) => {
                            if (slot.slot_type !== 'NORMAL') {
                              return <div key={idx}>{slot.start_time} - {slot.end_time} (Slot {slot.slot_number}, {slot.slot_type})</div>;
                            }
                            return <div key={idx}>{slot.start_time} - {slot.end_time} (Slot {slot.slot_number}, {slot.slot_type}) • {slot.subject_name || 'No subject'} • {slot.room_name || 'No room'} • {slot.staff_name || 'No staff'}</div>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Rooms ({reviewData.rooms?.length || 0})</h3>
                  <div className="space-y-1 text-sm">{(reviewData.rooms || []).map((room, idx) => <p key={idx} className="text-gray-600">{room.room_name} ({room.room_type}, Cap: {room.capacity})</p>)}</div>
                </div>
                <div className="border-l-4 border-green-600 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Subjects ({reviewData.subjects?.length || 0})</h3>
                  <div className="space-y-1 text-sm">{(reviewData.subjects || []).map((subject, idx) => <p key={idx} className="text-gray-600">{subject.name} ({subject.subject_type}) • {subject.staff_name}</p>)}</div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(4)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center gap-2"><ChevronLeft size={18} />Back</button>
                <button onClick={handleGenerateTimetable} disabled={loading || !batchId} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">{loading ? 'Generating...' : 'Generate Timetable'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 6 && (
            <motion.div key="step6" variants={stepVariants} initial="enter" animate="center" exit="exit" className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Step 6: Generated Timetable</h2>
              <div className="mb-4 text-sm text-gray-600 border-b pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-gray-700">Batch</p>
                    <p>{reviewData.basic?.department} – Yr {reviewData.basic?.year} Sec {reviewData.basic?.section}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Days</p>
                    <p>{reviewData.workingDays?.length || 0} working days</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Subjects</p>
                    <p>{reviewData.subjects?.length || 0} total</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Rooms</p>
                    <p>{reviewData.rooms?.length || 0} total</p>
                  </div>
                </div>
              </div>
              <div className="mb-6 flex gap-4">
                <button onClick={handleDownloadPDF} className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={18} />Download PDF</button>
                <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors">Create New</button>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full text-xs border-collapse" style={{borderCollapse: 'collapse'}}>
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-3 py-2 bg-blue-900 text-white text-left font-bold">Day</th>
                      {(() => {
                        const slots = timetableData?.time_slots || [];
                        // Build ordered list of unique slot numbers
                        const slotNumbers = Array.from(new Set(slots.map(s => s.slot_number))).sort((a, b) => a - b);
                        // Prefer times from the first working day (if any), otherwise fallback to first occurrence
                        const firstWorkingDay = (timetableData?.day_configs || []).find(dc => dc.is_working_day)?.day;
                        const master = slotNumbers.map(num => {
                          return slots.find(s => s.slot_number === num && s.day === firstWorkingDay) || slots.find(s => s.slot_number === num);
                        }).filter(Boolean);
                        return master.map((slot, index) => {
                          const timeStr = `${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)}`;
                          return <th key={index} className="border border-gray-400 px-2 py-2 bg-blue-800 text-white text-center font-bold" style={{minWidth: '100px'}}>{timeStr}</th>;
                        });
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dayOrder = daysOfWeek;
                      const working = (timetableData?.day_configs || []).filter(day => day.is_working_day).sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

                      const masterSlots = (() => {
                        const slots = timetableData?.time_slots || [];
                        const slotNumbers = Array.from(new Set(slots.map(s => s.slot_number))).sort((a, b) => a - b);
                        const firstWorkingDay = (timetableData?.day_configs || []).find(dc => dc.is_working_day)?.day;
                        const master = slotNumbers.map(num => slots.find(s => s.slot_number === num && s.day === firstWorkingDay) || slots.find(s => s.slot_number === num)).filter(Boolean);
                        return master;
                      })();

                      const daySlotMap = (() => {
                        const map = {};
                        (timetableData?.time_slots || []).forEach(slot => {
                          if (slot?.day && slot?.slot_number != null) {
                            map[`${slot.day}_${slot.slot_number}`] = slot;
                          }
                        });
                        return map;
                      })();

                      const entries = timetableData?.entries || [];
                      const entriesMap = {};
                      entries.forEach(entry => {
                        for (let slotNumber = entry.slot_start; slotNumber <= entry.slot_end; slotNumber += 1) {
                          entriesMap[`${entry.day}_${slotNumber}`] = entry;
                        }
                      });

                      const getEntryBgClass = (entryType) => {
                        const type = String(entryType || 'SUBJECT').toUpperCase();
                        if (type === 'LUNCH') return 'bg-green-100';
                        if (type === 'BREAK') return 'bg-yellow-100';
                        if (type === 'LAB') return 'bg-blue-50';
                        return 'bg-white';
                      };

                      const getEntryTextClass = (entryType) => {
                        const type = String(entryType || 'SUBJECT').toUpperCase();
                        if (type === 'LUNCH') return 'text-green-900 font-bold';
                        if (type === 'BREAK') return 'text-yellow-900 font-bold';
                        return 'text-gray-900';
                      };

                      return working.map((day, rowIndex) => (
                        <tr key={day.day} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-400 px-3 py-2 font-bold text-gray-800 bg-gray-100">{day.day}</td>
                          {(() => {
                            const cells = [];
                              for (let slotIdx = 0; slotIdx < masterSlots.length; slotIdx++) {
                                const slot = masterSlots[slotIdx];
                              const entry = entriesMap[`${day.day}_${slot.slot_number}`];
                                if (entry && entry.slot_start === slot.slot_number) {
                                const span = Math.max(1, entry.slot_end - entry.slot_start + 1);
                                const entryType = entry.entry_type || 'SUBJECT';
                                cells.push(
                                    <td key={`${day.day}_${slotIdx}`} colSpan={span} className={`border border-gray-400 px-2 py-2 align-middle text-center ${getEntryBgClass(entryType)}`}>
                                    <div className={`font-bold text-xs leading-tight ${getEntryTextClass(entryType)}`}>
                                      {entry.subject_name || entryType}
                                    </div>
                                    {(entry.entry_type === 'SUBJECT' || entry.entry_type === 'LAB') && (
                                      <>
                                        <div className="text-xs text-gray-700 leading-tight">({entry.staff_name || '–'})</div>
                                        <div className="text-xs text-gray-600 leading-tight">{getEntryRoom(entry)}</div>
                                      </>
                                    )}
                                  </td>
                                );
                                  slotIdx += span - 1;
                              } else {
                                  cells.push(<td key={`${day.day}_${slotIdx}`} className="border border-gray-400 px-2 py-3 bg-white" />);
                              }
                              }
                            return cells;
                          })()}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-8 text-xs text-gray-600">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-gray-400"></div><span>1–1 PM : Lunch Break</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-gray-400"></div><span>Short Break</span></div>
                <p className="text-xs italic text-gray-500">* Timetable is subject to change</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimetableGenerator;