import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, Eye, File, FileImage } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentsTabProps {
  documents: any[];
}

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'passport':
    case 'contract':
      return <FileText className="w-5 h-5 text-primary" />;
    case 'certificate':
    case 'photo':
      return <FileImage className="w-5 h-5 text-primary" />;
    default:
      return <File className="w-5 h-5 text-primary" />;
  }
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Документы</h3>
        <Button size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Загрузить документ
        </Button>
      </div>

      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc: any, i) => (
            <div key={doc.id || i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-background rounded-lg">
                  {getDocumentIcon(doc.document_type || 'document')}
                </div>
                <div>
                  <p className="font-medium">{doc.document_name || `Документ ${i+1}`}</p>
                  {doc.uploaded_at && (
                    <p className="text-xs text-muted-foreground">
                      Загружен: {format(new Date(doc.uploaded_at), 'dd.MM.yyyy HH:mm')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{doc.document_type || 'Файл'}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Нет загруженных документов</p>
      )}
    </Card>
  );
};