import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Mail, Edit2, Sparkles } from 'lucide-react';
import { LoadingState } from '../ui/LoadingState';

interface CampaignTemplateEditorProps {
  templateSubject: string;
  templateBody: string;
  handleEditTemplate: () => void;
  handleGenerateTemplate: () => void;
  generatingTemplate: boolean;
  currentUserRole: string;
}

export function CampaignTemplateEditor({
  templateSubject,
  templateBody,
  handleEditTemplate,
  handleGenerateTemplate,
  generatingTemplate,
  currentUserRole
}: CampaignTemplateEditorProps) {
  return (
    <Card className="border-primary-100 bg-primary-50/10">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <h2 className="text-sm font-normal text-primary-700 uppercase tracking-widest flex items-center gap-2 font-outfit">
          <Mail size={16} /> Outreach Template
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {templateSubject || templateBody ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Subject</div>
              <div className="text-sm text-gray-900 bg-white border border-gray-100 rounded-lg px-3 py-2">
                {templateSubject || <span className="text-gray-400 italic">No subject yet</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Body</div>
              <div className="text-sm text-gray-800 bg-white border border-gray-100 rounded-lg px-3 py-3 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {templateBody || <span className="text-gray-400 italic">No body yet</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4 bg-white/60 border border-dashed border-primary-200 rounded-lg">
            <Sparkles size={20} className="mx-auto text-primary-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">No outreach template yet</p>
            <p className="text-[11px] text-gray-400">Draft one with AI, or click Edit to write from scratch.</p>
          </div>
        )}

        {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUserRole) && (
          <div className="space-y-2">
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleGenerateTemplate}
                disabled={generatingTemplate}
                className="w-full !bg-white hover:!bg-purple-50 !text-purple-700 !border !border-purple-200 shadow-sm"
                icon={generatingTemplate ? <LoadingState mini /> : <Sparkles size={16} />}
              >
                {generatingTemplate ? 'Drafting...' : (templateSubject || templateBody ? 'Regenerate with AI' : 'Draft with AI')}
              </Button>
              <Button
                onClick={handleEditTemplate}
                disabled={generatingTemplate}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20"
                icon={<Edit2 size={14} />}
              >
                Edit Template
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 text-center italic">
              AI uses this campaign's brand, offer, and audience to draft the email. Review in the editor and save when you're happy.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
