"use client";

import React from 'react';
import { MapPin, Clock, DollarSign, Users, Calendar, Briefcase, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    department: string;
    location: string;
    type: string;
    experience: string;
    salary: string;
    deadline: string;
    description: string;
    requirements: string[];
    companyLogo?: string;
    postedDate: string;
    applicants: number;
    interviews: number;
    selected: number;
    rejected: number;
    status: 'active' | 'closed' | 'draft';
  };
  onViewDetails: (job: any) => void;
  onEdit?: (job: any) => void;
}

export default function JobCard({ job, onViewDetails, onEdit }: JobCardProps) {
  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const daysRemaining = getDaysRemaining(job.deadline);
  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 3 && daysRemaining > 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-purple-500">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            {job.companyLogo ? (
              <img 
                src={job.companyLogo} 
                alt={job.company}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {job.title}
              </h3>
              <p className="text-gray-600 mb-2">{job.company}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {job.location}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {job.type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {job.salary}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={job.status === 'active' ? 'default' : job.status === 'draft' ? 'secondary' : 'destructive'}
              className={
                job.status === 'active' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : job.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {job.status.toUpperCase()}
            </Badge>
            
            {onEdit && (
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-blue-600">{job.applicants}</p>
            <p className="text-xs text-gray-600">Applicants</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Eye className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-600">{job.interviews}</p>
            <p className="text-xs text-gray-600">Interviews</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-lg font-semibold text-purple-600">{job.selected}</p>
            <p className="text-xs text-gray-600">Selected</p>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-lg font-semibold text-red-600">{job.rejected}</p>
            <p className="text-xs text-gray-600">Rejected</p>
          </div>
        </div>

        {/* Skills Preview */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {job.requirements.slice(0, 4).map((skill, index) => (
              <Badge 
                key={index}
                variant="outline"
                className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border-gray-200"
              >
                {skill}
              </Badge>
            ))}
            {job.requirements.length > 4 && (
              <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 text-gray-500">
                +{job.requirements.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Posted {formatDate(job.postedDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span 
                className={
                  isExpired 
                    ? 'text-red-600 font-medium' 
                    : isUrgent 
                    ? 'text-orange-600 font-medium' 
                    : 'text-gray-600'
                }
              >
                {isExpired ? 'Expired' : `${daysRemaining} days left`}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(job)}
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
            
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(job)}
                className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
