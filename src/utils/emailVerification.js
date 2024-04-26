import dns from "dns";
import { readFile } from "fs";
import path from "path";

import {
  general_university_info,
  university_domain,
} from "../model/university.model.js";

const insertDetails = async () => {
  await university_domain.create({
    domain: "demo",
    universityName: "demo",
  });

  await general_university_info.create({
    name: "demo",
    domains: ["demo"],
    web_pages: "demo",
    country: "demo",
    alpha_two_code: "demo",
    state_province: "demo",
  });
};

const isEmailValid = async (email) => {
  const emailDomain = email.split("@")[1];
  try {
    const mxRecords = await dns.promises.resolveMx(emailDomain);
    console.log(mxRecords);
    // Check if at least one MX record is found
    if (mxRecords && mxRecords.length > 0) {
      // Perform additional logic to get the university name based on the email domain
      const universityName = await getUniversityName("@" + emailDomain);
      console.log(emailDomain, universityName);
      return { isValid: true, universityName };
    }
    return { isValid: false, universityName: null };
  } catch (error) {
    console.error("Error checking MX records:", error);
    return { isValid: false, universityName: null };
  }
};

// Check if the email is from a disposable email provider
let blocklist;
const isDisposableEmail = async (email) => {
  const emailDomain = email.split("@")[1];
  if (!blocklist) {
    const blocklistPath =
      "/home/divy/Desktop/development/uniForum/uniForum-backend/src/db/disposable_email_blocklist.conf";

    const content = await readFile(blocklistPath, {
      encoding: "utf-8",
    });
    blocklist = content.split("\r\n").slice(0, -1);
  }

  return blocklist.includes(emailDomain);
};

const getUniversityName = async (emailDomain) => {
  // Search in the first collection
  console.log("emailDomain", emailDomain);
  const university1 = await university_domain.findOne({ domain: emailDomain });
  if (university1) {
    return university1.universityName;
  }

  const parts = emailDomain.split("."); // Split the email domain into parts
  const potentialParentDomains = [];

  for (let i = parts.length - 1; i > 0; i--) {
    potentialParentDomains.push(parts.slice(i).join("."));
  }

  // Now query the database to find a match
  const university2 = await general_university_info.findOne({
    domains: { $in: potentialParentDomains },
  });

  if (university2) {
    console.log(university2);
    return university2.name;
  }

  return null;
};

export { isEmailValid, isDisposableEmail, insertDetails };
