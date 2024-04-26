import mongoose from "mongoose";
const universitySchema = new mongoose.Schema({
  universityName: {
    type: String,
  },
});

export const University = mongoose.model("University", universitySchema);

const university1Schema = new mongoose.Schema({
  universityName: String,
  domain: String,
});

// Create the University1 model
export const university_domain = mongoose.model('university_domain', university1Schema);


const university2Schema = new mongoose.Schema({
  name: String,
  domains: [
    {
      type: String
    }
  ],
  web_pages: String,
  country: String,
  alpha_two_code: String,
  state_province: String
});

// Create the University2 model
export const general_university_info = mongoose.model('general_university_info', university2Schema);

