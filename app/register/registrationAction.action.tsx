"use server";

export const registrationAction = async (formData: FormData) => {
  const{name,userName,email,password,confirmPassword,role} = Object.fromEntries(formData);
  console.log(name,userName,email,password,confirmPassword,role);
};
