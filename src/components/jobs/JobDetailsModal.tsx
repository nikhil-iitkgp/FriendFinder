"use client";

import React from 'react';
import { X, MapPin, Clock, DollarSign, Users, Calendar, Briefcase, Star, Share2, Bookmark, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    benefits?: string[];
    companyLogo?: string;
    postedDate: string;
    applicants: number;
    status: 'active' | 'closed' | 'draft';
  };
}

export default function JobDetailsModal({ isOpen, onClose, job }: JobDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(job.deadline);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            {job.companyLogo ? (
              <img 
                src={job.companyLogo} 
                alt={job.company}
                className="w-16 h-16 rounded-xl bg-white/20 p-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Briefcase className="w-8 h-8" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
              <p className="text-blue-100 text-lg mb-3">{job.company}</p>
              
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <MapPin className="w-3 h-3 mr-1" />
                  {job.location}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {job.type}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {job.salary}
                </Badge>
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                variant={job.status === 'active' ? 'default' : 'secondary'}
                className={job.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {job.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="p-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Applicants</p>
                      <p className="font-semibold">{job.applicants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Days Left</p>
                      <p className="font-semibold">{daysRemaining > 0 ? daysRemaining : 'Expired'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-semibold">{job.department}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="font-semibold">{job.experience}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Apply Now
              </Button>
              <Button variant="outline" size="lg">
                <Bookmark className="w-4 h-4 mr-2" />
                Save Job
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Company Page
              </Button>
            </div>

            <Separator className="mb-8" />

            {/* Job Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                Job Description
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>
            </div>

            <Separator className="mb-8" />

            {/* Required Skills */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((skill, index) => (
                  <Badge 
                    key={index}
                    variant="secondary"
                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 hover:from-blue-100 hover:to-purple-100 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Benefits (if available) */}
            {job.benefits && job.benefits.length > 0 && (
              <>
                <Separator className="mb-8" />
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    Benefits & Perks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {job.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator className="mb-8" />

            {/* Application Timeline */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                Application Timeline
              </h2>
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Posted on</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.postedDate)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Application Deadline</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.deadline)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Time Remaining</p>
                    <p className={`font-semibold ${daysRemaining > 7 ? 'text-green-600' : daysRemaining > 3 ? 'text-orange-600' : 'text-red-600'}`}>
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Job ID: {job.id} • Posted {formatDate(job.postedDate)}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
