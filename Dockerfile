#Choose the base image
FROM node:lts

#Set the working directory
WORKDIR /app

#Copy the files to app
COPY . .

RUN npm install

ENV PORT=8000
ENV MONGO_URI=mongodb+srv://Faqih:vclMi7nVZV9o7Juy@cluster0.8mgn0lc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
ENV JWT_ACCESS_SECRET=mAJjbQMf9EwM9t3kItkgy6f5PiehAAVZPXjWVbp9KNY=
ENV JWT_REFRESH_SECRET=IMl7ovLlyeqAA13Wmb5IlAs9DwFMJgwkh+VARr5Zr7rnW3gALuqQsEYUZx5bebelpb+14KK3QO5atrd/WPAeoA==

EXPOSE 8000

CMD ["npm", "run", "start"]