'use client';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ZoomInIcon, ZoomOutIcon, DownloadIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { addMonths, format, subMonths } from "date-fns";
import { useState, useRef } from "react";
import { DateRange } from "react-day-picker";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { COMPANY } from "@/lib/company";

const properties = [
  "Southampton Street, RG1 2QW",
  "Apt 2, Lingmell Court, Seascale, Cumbria, CA20 1HQ",
  "49A Saint Clement's Street, Oxfordshire, OX4 1AG",
  "Flat 2, 18 Dalkeith Road, Newington, Edinburgh, EH16 5BP"
];

const sampleBookings = [
  {
    checkIn: "2024-05-01",
    checkOut: "2024-05-07",
    platform: "Airbnb",
    amount: "£1,250.00"
  },
  {
    checkIn: "2024-05-15",
    checkOut: "2024-05-20",
    platform: "Booking.com",
    amount: "£980.00"
  },
  {
    checkIn: "2024-06-10",
    checkOut: "2024-06-17",
    platform: "VRBO",
    amount: "£1,450.00"
  }
];

const generateRandomDateRange = () => {
  const today = new Date();
  const fromDate = subMonths(today, Math.floor(Math.random() * 6) + 1);
  const toDate = addMonths(fromDate, Math.floor(Math.random() * 3) + 1);
  return { from: fromDate, to: toDate };
};

export default function BookingReports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProperty, setSelectedProperty] = useState<string>(properties[0]);
  const [showReport, setShowReport] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [scale, setScale] = useState<number>(0.8);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getLastFourMonths = () => {
    const today = new Date();
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const date = subMonths(today, i);
      months.push({
        name: format(date, "MMM"),
        date: date
      });
    }
    return months;
  };

  const handleApplyDate = () => {
    setDateRange(tempRange);
    setShowReport(true);
    setIsPreviewMode(false);
    setIsCalendarOpen(false);
  };

  const handleCancelDate = () => {
    setTempRange(dateRange);
    setIsCalendarOpen(false);
  };

  const handlePreview = () => {
    setIsPreviewMode(true);
    setShowReport(true);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setScale(0.8);
  };

  const generatePDFWithCanvas = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('booking-report.pdf');
    } catch {
      console.error('PDF generation error');
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generatePDFWithHtmlToImage = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: 'white'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (reportRef.current.offsetHeight * imgWidth) / reportRef.current.offsetWidth;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('booking-report.pdf');
    } catch {
      console.error('PDF generation error');
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await generatePDFWithHtmlToImage();
    } catch {
      console.log('Falling back to canvas method');
      await generatePDFWithCanvas();
    }
  };

  const filteredBookings = isPreviewMode 
    ? sampleBookings 
    : sampleBookings.filter(booking => {
        if (!dateRange?.from || !dateRange?.to) return false;
        const checkInDate = new Date(booking.checkIn);
        return checkInDate >= dateRange.from && checkInDate <= dateRange.to;
      });

  const previewDateRange = isPreviewMode ? generateRandomDateRange() : dateRange;
  const previewProperty = isPreviewMode 
    ? properties[Math.floor(Math.random() * properties.length)] 
    : selectedProperty;

  const totalIncomings = filteredBookings.reduce((sum, booking) => {
    return sum + parseFloat(booking.amount.replace(/[^0-9.-]+/g,""));
  }, 0);

  const managementFee = totalIncomings * 0.1;
  const vat = managementFee * 0.2;
  const totalOutgoings = managementFee + vat;
  const netAmount = totalIncomings - totalOutgoings;

  const renderReportContent = () => (
    <>
      <div className="w-[100%] mx-auto mb-8 p-6 bg-black rounded-lg">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Company Logo"
            width={150}
            height={50}
            className="object-contain"
          />
        </div>
      </div>

      <div className="mb-8 p-4 border-2 border-gray-100 rounded-lg bg-gray-50">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{previewProperty}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-gray-700">Report Period:</p>
            <p className="text-gray-900">
              {previewDateRange?.from ? format(previewDateRange.from, "MMM dd, yyyy") : ''} - {previewDateRange?.to ? format(previewDateRange.to, "MMM dd, yyyy") : ''}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Generated On:</p>
            <p className="text-gray-900">{format(new Date(), "MMM dd, yyyy")}</p>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-b-2 border-teal-200 py-2 my-6 bg-teal-50">
        <h3 className="font-bold text-lg text-center text-teal-800">RESERVATION STATEMENT</h3>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 p-4 border-2 border-gray-100 rounded-lg">
        <div className="space-y-2">
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Invoice Number:</span> RS03019
          </p>
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Invoice Period Start:</span> {previewDateRange?.from ? format(previewDateRange.from, "MMM dd, yyyy") : ''}
          </p>
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Invoice Period End:</span> {previewDateRange?.to ? format(previewDateRange.to, "MMM dd, yyyy") : ''}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Supplier Name:</span> {COMPANY.name}
          </p>
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Supplier Registration:</span> {COMPANY.registration}
          </p>
          <p className="text-gray-900">
            <span className="font-semibold text-gray-700">Supplier VAT:</span> {COMPANY.vat}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h4 className="font-semibold mb-4 text-green-800">INCOMINGS</h4>
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-green-50">
              <tr>
                <th className="text-left p-3 text-green-800">Check In</th>
                <th className="text-left p-3 text-green-800">Check Out</th>
                <th className="text-left p-3 text-green-800">Platform</th>
                <th className="text-left p-3 text-green-800">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 text-gray-800">{format(new Date(booking.checkIn), "MMM dd, yyyy")}</td>
                    <td className="p-3 text-gray-800">{format(new Date(booking.checkOut), "MMM dd, yyyy")}</td>
                    <td className="p-3 text-gray-800">{booking.platform}</td>
                    <td className="p-3 text-gray-800">{booking.amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No bookings in this period
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-green-50">
              <tr>
                <td colSpan={3} className="p-3 font-semibold text-green-800">TOTAL INCOMINGS:</td>
                <td className="p-3 font-semibold text-green-800">£{totalIncomings.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mb-8 p-4 border-2 border-red-200 rounded-lg bg-red-50">
        <h4 className="font-semibold mb-4 text-red-800">OUTGOINGS</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Management Fee (10%)</span>
            <span className="text-gray-900">£{managementFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">VAT (20%)</span>
            <span className="text-gray-900">£{vat.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2"></div>
          <div className="flex justify-between font-semibold">
            <span className="text-red-800">TOTAL OUTGOINGS:</span>
            <span className="text-red-800">£{totalOutgoings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-b-2 border-teal-200 py-4 my-6 bg-teal-50">
        <div className="flex justify-between text-lg font-bold text-teal-800">
          <span>NET AMOUNT PAYABLE:</span>
          <span>£{netAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 mt-8 space-y-1 p-4 border-2 border-gray-200 rounded-lg">
        <p>{COMPANY.name} | Registered in England and Wales | CRN: {COMPANY.registration}</p>
        <p>{COMPANY.address}</p>
        <p>{COMPANY.email} | {COMPANY.phone}</p>
        <p className="mt-4 text-gray-500">This is an automatically generated report</p>
      </div>
    </>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Booking Reports</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="no-print"
                >
                  <ZoomOutIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleResetZoom}
                  className="no-print"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Zoom</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 1.5}
                  className="no-print"
                >
                  <ZoomInIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="no-print"
                >
                  {isGeneratingPDF ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <DownloadIcon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download PDF</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button 
            variant="default" 
            className="no-print"
            onClick={handlePreview}
          >
            PREVIEW REPORT
          </Button>
        </div>
      </div>

      <div className="p-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="w-full sm:w-72">
              <p className="text-sm font-medium mb-1">Date Range</p>
              <div className="flex gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal border-1 border-gray-300"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4 grid grid-cols-4 gap-2">
                      {getLastFourMonths().map((month, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const startDate = new Date(month.date.getFullYear(), month.date.getMonth(), 1);
                            const endDate = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0);
                            setTempRange({ from: startDate, to: endDate });
                          }}
                        >
                          {month.name}
                        </Button>
                      ))}
                    </div>
                    <Calendar
                      mode="range"
                      selected={tempRange}
                      onSelect={setTempRange}
                      numberOfMonths={1}
                      initialFocus
                    />
                    <div className="flex justify-end gap-2 p-2 border-t">
                      <Button variant="outline" size="sm" onClick={handleCancelDate}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleApplyDate}
                        disabled={!tempRange?.from || !tempRange?.to}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="w-full sm:w-72">
              <p className="text-sm font-medium mb-1">Property Address</p>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="border-1 border-gray-300">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property} value={property}>
                      {property}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 items-end h-full">
            <Button 
              variant="outline" 
              className="no-print"
              onClick={() => {
                setDateRange(undefined);
                setTempRange(undefined);
                setShowReport(false);
              }}
              disabled={!dateRange && !isPreviewMode}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {showReport && (
        <div 
          ref={reportRef}
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-in-out',
            width: '100%',
            margin: '0 auto'
          }}
          className="bg-white"
        >
          <Card className="border-2 border-teal-100 shadow-lg">
            <CardContent className="p-8 bg-white">
              {renderReportContent()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}