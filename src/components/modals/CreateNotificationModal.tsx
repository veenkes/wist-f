import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Upload, Users, User, UserCheck, Building, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { studentService, notificationService, uploadService } from '@/services';
import type { Student, CreateNotificationRequest } from '@/types/api.types';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('news');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(['in-app']);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearch, setStudentsSearch] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (deliveryMethods.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one delivery method',
        variant: 'destructive',
      });
      return;
    }

    if (recipientType === 'custom' && selectedStudents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one student for custom selection',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Map UI types to API types
      const apiTypeMap: Record<string, 'Alert' | 'Info' | 'Warning' | 'Success'> = {
        payment: 'Alert',
        news: 'Info',
        event: 'Info',
        administrative: 'Warning',
      };

      // Map recipient types
      const targetAudienceMap: Record<string, string> = {
        all: 'All',
        students: 'Students',
        parents: 'Parents',
        staff: 'Staff',
        custom: selectedStudents.length > 0 ? selectedStudents.join(',') : 'All',
      };

      const notificationData: CreateNotificationRequest = {
        title,
        message,
        type: apiTypeMap[type] || 'Info',
        target_audience: targetAudienceMap[recipientType] || 'All',
        methods: deliveryMethods as ('telegram' | 'in-app' | 'email' | 'sms')[],
        attachments: attachments,
      };

      await notificationService.createNotification(notificationData);
      
      toast({
        title: 'Success',
        description: 'Notification created successfully!',
      });

      // Reset form
      setType('news');
      setTitle('');
      setMessage('');
      setRecipientType('all');
      setDeliveryMethods(['in-app']);
      setSelectedStudents([]);
      setStudentsSearch('');
      setAttachments([]);
      onClose();
      onSuccess?.();
      } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create notification',
        variant: 'destructive',
      });
    }
  };

  const toggleDeliveryMethod = (method: string) => {
    setDeliveryMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  // Load students when Custom Selection is chosen
  useEffect(() => {
    if (recipientType === 'custom' && isOpen) {
      loadStudents();
    }
  }, [recipientType, isOpen]);

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const response = await studentService.listStudents({ page: 1, limit: 1000 });
      
      // API returns { students: [...], total: "..." } not PaginatedResponse
      let studentsArray: any[] = [];
      if (response && typeof response === 'object') {
        if ('students' in response && Array.isArray((response as any).students)) {
          // New format: { students: [...], total: "..." }
          studentsArray = (response as any).students;
        } else if ('data' in response && Array.isArray((response as any).data)) {
          // PaginatedResponse format: { data: [...], pagination: {...} }
          studentsArray = (response as any).data;
        } else if (Array.isArray(response)) {
          // Direct array
          studentsArray = response;
        }
      }
      
      // Map snake_case to camelCase if needed and ensure all required fields
      const mappedStudents: Student[] = studentsArray.map((student: any) => ({
        id: student.id,
        name: student.name || '',
        surname: student.surname || '',
        grade: student.grade || 0,
        className: student.class_name || student.className || '',
        dateOfBirth: student.date_of_birth || student.dateOfBirth || '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        idPassport: student.id_passport || student.idPassport || '',
        enrollmentDate: student.enrollment_date || student.enrollmentDate || '',
        balance: student.balance || 0,
        totalOwed: student.total_owed || student.totalOwed || 0,
        avatar: student.avatar || '',
        status: student.status || 'active',
        academicStatus: student.academic_status || student.academicStatus || 'good',
        parents: (student.parents || []).map((p: any) => ({
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          relationship: p.relationship || '',
        })),
        createdAt: student.created_at || student.createdAt || new Date().toISOString(),
        updatedAt: student.updated_at || student.updatedAt || new Date().toISOString(),
      }));
      setStudents(mappedStudents);
      } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = useMemo(() => {
    if (!studentsSearch) return students;
    const searchLower = studentsSearch.toLowerCase();
    return students.filter((student) => 
      student.name?.toLowerCase().includes(searchLower) ||
      student.surname?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  }, [students, studentsSearch]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const response = await uploadService.uploadFile(file);
        return response.url;
          } catch (error) {
        toast({
          title: 'Upload Error',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter((url): url is string => url !== null);
    setAttachments((prev) => [...prev, ...validUrls]);
    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const recipientOptions = [
    { value: 'all', label: 'All Users', icon: Users },
    { value: 'students', label: 'All Students', icon: User },
    { value: 'parents', label: 'All Parents', icon: UserCheck },
    { value: 'staff', label: 'All Staff', icon: Building },
    { value: 'custom', label: 'Custom Selection', icon: Users },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Create Notification
          </DialogTitle>
          <DialogDescription>
            Create and send notifications to users, students, parents, or staff.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type */}
          <div className="space-y-2">
            <Label>Notification Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news">Info</SelectItem>
                <SelectItem value="payment">Alert</SelectItem>
                <SelectItem value="administrative">Warning</SelectItem>
                <SelectItem value="event">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients *</Label>
            <div className="grid grid-cols-2 gap-3">
              {recipientOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card
                    key={option.value}
                    className={`p-4 cursor-pointer transition-all ${
                      recipientType === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setRecipientType(option.value);
                      if (option.value !== 'custom') {
                        setSelectedStudents([]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Custom Selection - Student List */}
            {recipientType === 'custom' && (
              <div className="mt-4 space-y-3 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentsSearch}
                    onChange={(e) => setStudentsSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                {studentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading students...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No students found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudents.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label 
                            className="flex-1 cursor-pointer"
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <p className="text-sm font-medium">
                              {student.name} {student.surname}
                            </p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedStudents.length > 0 && (
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery Methods */}
          <div className="space-y-2">
            <Label>Delivery Methods *</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="in-app"
                  checked={deliveryMethods.includes('in-app')}
                  onCheckedChange={() => toggleDeliveryMethod('in-app')}
                />
                <label htmlFor="in-app" className="text-sm cursor-pointer">
                  In-App Notification
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={deliveryMethods.includes('email')}
                  onCheckedChange={() => toggleDeliveryMethod('email')}
                />
                <label htmlFor="email" className="text-sm cursor-pointer">
                  Email
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="telegram"
                  checked={deliveryMethods.includes('telegram')}
                  onCheckedChange={() => toggleDeliveryMethod('telegram')}
                />
                <label htmlFor="telegram" className="text-sm cursor-pointer">
                  Telegram
                </label>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <label
              htmlFor="file-upload-input"
              className={`block border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={(e) => {
                // Prevent default label behavior and manually trigger input click
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              {uploading ? (
                <p className="text-sm text-muted-foreground">Uploading...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Images, or Documents
                  </p>
                </>
              )}
            </label>
            
            {/* Uploaded files list */}
            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((url, index) => {
                  const fileName = url.split('/').pop() || `Attachment ${index + 1}`;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{fileName}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Send className="w-4 h-4" />
              Send Notification
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
