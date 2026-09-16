const CANDIDATES_DATA = [
  {
    id: "najiur",
    name: "Mir Najiur Rahman",
    phone: "+1 571 708 5402",
    email: "",
    address: "14217 Westway ln, apt# 13, Woodbridge, VA 22193",
    compensation: "",
    academicTimeline: "Check resume",
    birthDate: "7/2/1986",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "",
    drivingLicense: "Yes, Regular",
    visaType: "Work Authorization – EAD",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "maahir",
    name: "Maahir Azmain Chowdhury",
    phone: "",
    email: "",
    address: "2916 Network Pl, Apt 102A, Lutz, FL 33559",
    compensation: "",
    academicTimeline: "",
    birthDate: "",
    openForRelocation: "",
    protectedVeteran: "",
    disability: "",
    drivingLicense: "Class E",
    visaType: "",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "mahbubul",
    name: "Md Mahbubul Alam",
    phone: "",
    email: "",
    address: "5085 Eldridge st, Hamtramck, MI 48212",
    compensation: "70k-100k",
    academicTimeline: "",
    birthDate: "08/20/1988",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "Yes, Operator",
    visaType: "F1 OPT with EAD",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "aminul",
    name: "Md Aminul Sarker",
    phone: "",
    email: "md.sarker.aminul@gmail.com",
    address: "3415 Parsons Blvd, Flushing, New York, 11354",
    compensation: "70k-100k",
    academicTimeline: "May 2022 - June 2026",
    birthDate: "1995",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "Yes, regular non-commercial license",
    visaType: "",
    relocating: "",
    peLicense: "No",
    notes: ""
  },
  {
    id: "saddam",
    name: "Saddam H.",
    phone: "",
    email: "",
    address: "991 Leon Road, Pittsburgh, Pennsylvania 15220",
    compensation: "70k-100k",
    academicTimeline: "January 2024– May 2026, Master degree: Public Administration, Gannon University, Erie, PA, USA. January 2017 – December 2020, Bachelor of Science in Engineering: Electrical and Electronics Engineering, The University of Comilla, Dhaka, Bangladesh.",
    birthDate: "06/20/1991",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "Yes, D",
    visaType: "F1 (OPT)",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "ahmed",
    name: "Ahmed Chowdhury",
    phone: "",
    email: "",
    address: "507 Main St, Worcester, MA, 01608",
    compensation: "70k-100k, not sure honestly depends on location and other packages but maybe around 75k-80k",
    academicTimeline: "Aug 2022 - Jun 2026",
    birthDate: "May 31st 2003",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No disabilities",
    drivingLicense: "Yes, Class D",
    visaType: "F1 waiting for OPT",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "abrar",
    name: "Abrar Zahin",
    phone: "+1 (813) 723-9899",
    email: "",
    address: "2916 Network place, Lutz, FL 33559",
    compensation: "70k-100k",
    academicTimeline: "August 2022 - May 2026, Major: Computer Engineering",
    birthDate: "Nov 25, 2002",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "Not disabled",
    drivingLicense: "Florida Class E",
    visaType: "F1-OPT",
    relocating: "",
    peLicense: "No",
    notes: ""
  },
  {
    id: "saif",
    name: "Saif Hasnath",
    phone: "",
    email: "",
    address: "2415 171st street Hammond Indiana 46323",
    compensation: "~85k",
    academicTimeline: "B.sc 2016-2020, M.Sc Aug 24 - May 2026",
    birthDate: "07-02-1997",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "No",
    visaType: "F1 (OPT applied but not approved yet)",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "rayda",
    name: "Rayda Noor",
    phone: "",
    email: "",
    address: "102 Duskwood Dr, Harvest, AL 35749",
    compensation: "60000 Annual",
    academicTimeline: "Bachelors 2014-2018, MBA 2019-2022, MS 2025-2026",
    birthDate: "Sept 01, 1996",
    openForRelocation: "Depends on the job and location",
    protectedVeteran: "No",
    disability: "None",
    drivingLicense: "Regular driver license class C",
    visaType: "Green Card",
    relocating: "Depends on the job and location",
    peLicense: "No",
    notes: "Not an engineer"
  },
  {
    id: "adnan",
    name: "Adnan Tarif",
    phone: "",
    email: "",
    address: "208-07 Hillside Avenue, Queens Village, NY 11427",
    compensation: "$70,000–$100,000 annually",
    academicTimeline: "University at Buffalo — B.S. in Management Information Systems (MIS), Graduated May 2026 (Sep 2021 - May 2026)",
    birthDate: "December 30, 2001",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "Yes, Class D",
    visaType: "US Citizen (EAD card: Yes)",
    relocating: "Yes",
    peLicense: "No",
    notes: "No sponsorship needed"
  },
  {
    id: "hija",
    name: "Hija Tovi",
    phone: "",
    email: "",
    address: "3415 Premier Dr, Plano, TX 75023",
    compensation: "",
    academicTimeline: "",
    birthDate: "",
    openForRelocation: "",
    protectedVeteran: "",
    disability: "",
    drivingLicense: "",
    visaType: "US Citizen",
    relocating: "",
    peLicense: "",
    notes: ""
  },
  {
    id: "nujhat",
    name: "Nujhat Khan",
    phone: "+19295439242",
    email: "",
    address: "36 Vroom St, Apartment 7, Jersey City, NJ 07306",
    compensation: "$68,000/year or $33/hour",
    academicTimeline: "B.S. in Architecture, New Jersey Institute of Technology (NJIT), graduated May 2026; Cum Laude",
    birthDate: "July 23, 1999",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "Not Applicable",
    drivingLicense: "No",
    visaType: "F-1 student visa / OPT",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "akib",
    name: "Akib Zaman",
    phone: "8132789749",
    email: "",
    address: "1954 1st ave apt 13 T, NY, NY, 10029",
    compensation: "70k-100k",
    academicTimeline: "Graduated May 2023",
    birthDate: "10/14/2000",
    openForRelocation: "No, Remote only",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "Yes",
    visaType: "US Citizen",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  },
  {
    id: "geetha",
    name: "Geetha Ragiphani",
    phone: "983-398-1082",
    email: "",
    address: "Conway, SC 29526",
    compensation: "$70,000–$100,000",
    academicTimeline: "Master's in Business Analytics — Graduated December 2024",
    birthDate: "April 2, 1996",
    openForRelocation: "Yes",
    protectedVeteran: "No",
    disability: "No",
    drivingLicense: "No",
    visaType: "F-1 STEM OPT",
    relocating: "Yes",
    peLicense: "No",
    notes: ""
  }
];

const REFERENCES_DATA = [
  {
    id: "ref1",
    name: "Shafee Ibna Amin",
    title: "Manager",
    company: "Inuberry",
    phone: "",
    email: "shafee@inuberry.com",
    relationship: "Professional"
  },
  {
    id: "ref2",
    name: "Kasshaf Ahmad",
    title: "Manager",
    company: "Skarion",
    phone: "+1 571 638 7051",
    email: "ahmadk@skarion.com",
    relationship: "Professional"
  },
  {
    id: "ref3",
    name: "Faisal Mahmud",
    title: "Director",
    company: "Skarion",
    phone: "8135850327",
    email: "faisal@skarion.com",
    relationship: "Professional"
  },
  {
    id: "ref4",
    name: "Abdullah Al Saki",
    title: "CEO",
    company: "Skarion",
    phone: "8133279346",
    email: "aasaki@skarion.com",
    relationship: "Professional"
  }
];

const DEFAULT_REFERENCES_TEXT = `Reference Type: Professional
Title: Manager
Name: Shafee Ibna Amin
Phone Number:
Email Address: shafee@inuberry.com

Reference Type: Professional
Title: Manager
Name: Kasshaf Ahmad
Phone Number: +1 571 638 7051
Email Address: ahmadk@skarion.com

Reference Type: Professional
Title: Director
Name: Faisal Mahmud
Phone Number: 8135850327
Email Address: faisal@skarion.com

Reference Type: Professional
Title: CEO
Name: Abdullah Al Saki
Phone Number: 8133279346
Email Address: aasaki@skarion.com`;
